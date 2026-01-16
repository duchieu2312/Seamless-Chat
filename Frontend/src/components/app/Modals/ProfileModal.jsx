import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiCamera } from "react-icons/fi";
import React from "react";
import { toast } from "sonner";
import { uploadAvatar } from "../../../api/cloudinary";
import { getCloudinaryImageUrl } from "../../../utils/CloudinaryImageUrl";

function ProfileModal({
  isOpen,
  user,
  getAvatarColor,
  onClose,
  onUpdateAvatar,
  onUpdateProfile,
  onUpdatePassword,
}) {
  const fileInputRef = useRef(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [username, setUsername] = useState(user?.username || "");
  const [nameError, setNameError] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setUsername(user?.username || "");
    setNameError(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }, [isOpen, user]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setIsUploading(true);

      const avatarUrl = await uploadAvatar(file);

      const result = await onUpdateAvatar(avatarUrl);

      if (!result) return;
    } catch (err) {
      toast.error(err.message || "Failed to upload avatar.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      toast.error("Username is required.");
      return;
    }

    const changingPassword = currentPassword || newPassword || confirmPassword;

    if (changingPassword) {
      if (!currentPassword) {
        toast.error("Current password is required.");
        return;
      }

      if (!newPassword) {
        toast.error("New password is required.");
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error("New passwords do not match.");
        return;
      }
    }

    setIsSaving(true);

    try {
      const profileChanged = trimmedUsername !== user?.username;

      if (profileChanged) {
        const result = await onUpdateProfile({
          username: trimmedUsername,
        });

        if (result === "USERNAME_TAKEN") {
          setNameError(true);
          return;
        }

        if (!result) {
          return;
        }
      }

      if (changingPassword) {
        const result = await onUpdatePassword({
          currentPassword,
          newPassword,
        });

        if (!result) {
          return;
        }
      }

      toast.success("Profile updated successfully.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isUploading || isSaving) return;

    onClose();
  };

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{
              type: "spring",
              duration: 0.3,
              bounce: 0.15,
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#1e293b] border border-white/10 p-6 text-gray-100 shadow-2xl"
          >
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">Edit Profile</h2>

              <p className="mt-1 text-sm text-gray-400">
                Manage your profile information.
              </p>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="relative">
                {user?.avatarUrl ? (
                  <img
                    src={getCloudinaryImageUrl(user.avatarUrl, 300)}
                    alt={user.username}
                    className="w-30 h-30 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-30 h-30 rounded-full bg-gradient-to-br ${getAvatarColor(
                      user?.username || "?",
                    )} flex items-center justify-center text-3xl font-bold text-white`}
                  >
                    {user?.username?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isSaving}
                  className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center text-white transition-colors shadow-lg"
                  title="Change avatar"
                >
                  <FiCamera size={16} />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <p className="mt-3 text-xs text-gray-500">
                {isUploading
                  ? "Uploading avatar..."
                  : "PNG, JPG or WebP. Maximum 5 MB."}
              </p>
            </div>

            {/* Profile */}
            <div className="mt-6 space-y-4">
              {/* Username */}
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-300">
                  Username
                </label>

                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);

                    if (nameError) {
                      setNameError(false);
                    }
                  }}
                  disabled={isSaving || isUploading}
                  className={`w-full px-3 py-2.5 rounded-xl bg-[#0f172a] border text-sm text-white outline-none disabled:opacity-50 ${
                    nameError
                      ? "border-red-500 focus:border-red-500"
                      : "border-white/10 focus:border-indigo-500"
                  }`}
                />

                {nameError && (
                  <p className="mt-1.5 text-xs text-red-400">
                    This username is already taken.
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-300">
                  Email
                </label>

                <input
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f172a]/50 border border-white/5 text-sm text-gray-500 cursor-not-allowed outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mt-6 pt-6 border-t border-white/5">
              <h3 className="text-sm font-semibold text-white">
                Change Password
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Leave these fields empty if you don't want to change your
                password.
              </p>

              <div className="mt-4 space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-300">
                    Current Password
                  </label>

                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isSaving}
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f172a] border border-white/10 text-sm text-white outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-300">
                    New Password
                  </label>

                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSaving}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f172a] border border-white/10 text-sm text-white outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-300">
                    Confirm New Password
                  </label>

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSaving}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f172a] border border-white/10 text-sm text-white outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-white/5">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading || isSaving}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isUploading || isSaving}
                className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default React.memo(ProfileModal);
