import { motion, AnimatePresence } from "framer-motion";
import {
  FiX,
  FiUserX,
  FiSlash,
  FiUnlock,
  FiUserCheck,
  FiUserMinus,
} from "react-icons/fi";
import React, { useState } from "react";
import { createPortal } from "react-dom";

function ConfirmModal({
  confirmModal,
  setConfirmModal,
  onAcceptFriend,
  onDeclineFriend,
  onBlock,
  onUnfriend,
  onUnblock,
}) {
  const [processing, setProcessing] = useState(false);

  const handleClose = () => {
    if (processing) return;

    setConfirmModal({ open: false, type: "", friend: null });
  };

  const executeAction = async () => {
    const target = confirmModal.friend;

    if (!target || processing) return;

    setProcessing(true);

    try {
      let success = false;

      switch (confirmModal.type) {
        case "accept":
          success = await onAcceptFriend(target);
          break;

        case "decline":
          success = await onDeclineFriend(target);
          break;

        case "unfriend":
          success = await onUnfriend(target);
          break;

        case "block":
          success = await onBlock(target);
          break;

        case "unblock":
          success = await onUnblock(target);
          break;

        default:
          break;
      }

      if (success) {
        handleClose();
      }
    } finally {
      setProcessing(false);
    }
  };

  const config = {
    accept: {
      title: "Accept Friend Request",
      desc: `Do you want to accept the friend request from ${confirmModal.friend?.username} and add them to your friend list?`,
      btnText: "Accept",
      btnClass:
        "bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20",
      iconBg: "bg-indigo-500/20 text-indigo-400",
      icon: FiUserCheck,
    },
    decline: {
      title: "Decline Request",
      desc: `Are you sure you want to decline the friend request from ${confirmModal.friend?.username}?`,
      btnText: "Decline",
      btnClass: "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20",
      iconBg: "bg-red-500/20 text-red-400",
      icon: FiUserX,
    },
    unfriend: {
      title: "Unfriend",
      desc: `Are you sure you want to unfriend ${confirmModal.friend?.username}?`,
      btnText: "Unfriend",
      btnClass:
        "bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20",
      iconBg: "bg-orange-500/20 text-orange-400",
      icon: FiUserMinus,
    },
    block: {
      title: "Block User",
      desc: `Are you sure you want to block ${confirmModal.friend?.username}? They won't be able to message you or see your online status.`,
      btnText: "Block",
      btnClass: "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20",
      iconBg: "bg-red-500/20 text-red-400",
      icon: FiSlash,
    },
    unblock: {
      title: "Unblock User",
      desc: `Are you sure you want to unblock ${confirmModal.friend?.username}? They will be able to send you messages again.`,
      btnText: "Unblock",
      btnClass: "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20",
      iconBg: "bg-green-500/20 text-green-400",
      icon: FiUnlock,
    },
  };

  const current = config[confirmModal.type];

  if (!current) return null;

  const Icon = current.icon;

  return createPortal(
    <AnimatePresence mode="wait">
      {confirmModal.open && (
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

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1e293b] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl relative z-10 text-gray-100 overflow-hidden"
          >
            {/* Top Close Button */}
            <button
              onClick={handleClose}
              disabled={processing}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Close"
            >
              <FiX size={18} />
            </button>

            {/* Header & Body Content */}
            <div className="flex items-start gap-4 mb-6 mt-2">
              <div
                className={`w-12 h-12 rounded-xl ${current.iconBg} flex items-center justify-center flex-shrink-0 shadow-inner`}
              >
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <h3 className="text-xl font-bold text-white mb-1.5 tracking-tight">
                  {current.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {current.desc}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={processing}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeAction}
                disabled={processing}
                className={`px-5 py-2.5 ${current.btnClass} text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {processing ? "Processing..." : current.btnText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default React.memo(ConfirmModal);
