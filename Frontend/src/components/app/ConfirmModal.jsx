import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiUserX, FiSlash, FiUnlock } from "react-icons/fi";
import React from "react";

function ConfirmModal({
  confirmModal,
  setConfirmModal,
  onBlock,
  onUnfriend,
  onUnblock,
}) {
  const handleClose = () => {
    setConfirmModal({ open: false, type: "", friend: null });
  };

  const executeAction = () => {
    const target = confirmModal.friend;
    if (!target) return;

    switch (confirmModal.type) {
      case "unfriend":
        if (onUnfriend) onUnfriend(target);
        break;
      case "block":
        if (onBlock) onBlock(target);
        break;
      case "unblock":
        if (onUnblock) onUnblock(target);
        break;
      default:
        break;
    }
    handleClose();
  };

  const config = {
    unfriend: {
      title: "Unfriend",
      desc: `Are you sure you want to unfriend ${confirmModal.friend?.username}?`,
      btnText: "Unfriend",
      btnClass:
        "bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20",
      iconBg: "bg-orange-500/20 text-orange-400",
      icon: FiUserX,
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

  return (
    <AnimatePresence mode="wait">
      {confirmModal.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={handleClose}
        >
          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
            onClick={(e) => e.stopPropagation()} // Prevents overlay click triggers inside content box
            className="bg-[#1e293b] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden select-none"
          >
            {/* Top Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-lg transition-colors group"
              title="Close"
            >
              <FiX
                size={18}
                className="text-gray-400 group-hover:text-white transition-colors"
              />
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

            {/* Action Buttons Workspace */}
            <div className="flex gap-3 justify-end border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeAction}
                className={`px-5 py-2.5 ${current.btnClass} text-white rounded-xl text-sm font-semibold transition-all`}
              >
                {current.btnText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default React.memo(ConfirmModal);
