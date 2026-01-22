import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiCamera } from "react-icons/fi";
import React from "react";
import { toast } from "sonner";
import { uploadServerIcon } from "../../../api/cloudinary";
import { getCloudinaryImageUrl } from "../../../utils/CloudinaryImageUrl";

function CreateServerModal({ isOpen, onClose, onCreateServer }) {
  const [serverName, setServerName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [nameError, setNameError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [iconUrl, setIconUrl] = useState(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);

  const handleIconChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setIsUploadingIcon(true);

      const uploadedIconUrl = await uploadServerIcon(file);

      setIconUrl(uploadedIconUrl);
    } catch (err) {
      toast.error(err.message || "Failed to upload server icon.");
    } finally {
      setIsUploadingIcon(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanName = serverName.trim();

    if (!cleanName || processing) return;

    setNameError(false);
    setProcessing(true);

    try {
      if (onCreateServer) {
        const result = await onCreateServer({
          iconUrl,
          name: cleanName,
          description: description.trim() || null,
          isPublic,
        });

        if (result === "NAME_TAKEN") {
          setNameError(true);
          return;
        }

        if (!result) {
          return;
        }
      }

      setIconUrl(null);
      setServerName("");
      setDescription("");
      setIsPublic(true);
      setNameError(false);

      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const handleNameChange = (e) => {
    setServerName(e.target.value);

    if (nameError) {
      setNameError(false);
    }
  };

  const handleClose = () => {
    if (processing || isUploadingIcon) return;

    setIconUrl(null);
    setServerName("");
    setDescription("");
    setIsPublic(true);
    setNameError(false);

    onClose();
  };

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1e293b] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl relative z-10 text-gray-100 overflow-hidden"
          >
            {/* Close Button Anchor */}
            <button
              onClick={handleClose}
              disabled={processing}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Close"
            >
              <FiX size={18} />
            </button>

            {/* Modal Heading Header */}
            <div className="text-center mb-6 mt-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Create a Server
              </h2>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-sm mx-auto">
                Your server is where you and your friends hang out. Make yours
                and start talking.
              </p>
            </div>

            {/* Creation Form Context */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Server Icon */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {iconUrl ? (
                    <img
                      src={getCloudinaryImageUrl(iconUrl)}
                      alt="Server icon"
                      className="w-20 h-20 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-black/20 border border-white/10 flex items-center justify-center text-gray-500">
                      <FiCamera size={24} />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("server-icon-input")?.click()
                    }
                    disabled={processing || isUploadingIcon}
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center text-white shadow-lg transition-colors"
                    title="Change server icon"
                  >
                    <FiCamera size={14} />
                  </button>

                  <input
                    id="server-icon-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleIconChange}
                    className="hidden"
                  />
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  {isUploadingIcon
                    ? "Uploading icon..."
                    : "PNG, JPG or WebP. Maximum 5 MB."}
                </p>
              </div>

              {/* Server Name */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Server Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={serverName}
                  onChange={handleNameChange}
                  placeholder="e.g. Cool Server"
                  disabled={processing}
                  className={`w-full px-4 py-2.5 rounded-xl bg-black/20 border text-white focus:outline-none transition-all text-sm placeholder:text-gray-600 ${
                    nameError
                      ? "border-red-500 focus:border-red-500"
                      : "border-white/10 focus:border-indigo-500/50"
                  }`}
                />
                {nameError && (
                  <p className="text-xs text-red-400 mt-2">
                    This server name is already taken.
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this server about?"
                  disabled={processing}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white focus:border-indigo-500/50 focus:outline-none transition-all text-sm placeholder:text-gray-600 resize-none"
                />
              </div>

              {/* Is Public */}
              <div className="flex items-center justify-between rounded-xl bg-black/20 border border-white/10 px-4 py-3">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-semibold text-gray-200">
                    Public Server
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Allow other users to discover and join this server.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPublic}
                  onClick={() => setIsPublic((prev) => !prev)}
                  disabled={processing}
                  className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
                    isPublic ? "bg-indigo-500" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      isPublic ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Action Buttons Interface */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={processing}
                  className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!serverName.trim() || processing || isUploadingIcon}
                  className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-500 disabled:cursor-not-allowed font-semibold text-white text-sm transition-all shadow-md shadow-indigo-500/10"
                >
                  {processing ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default React.memo(CreateServerModal);
