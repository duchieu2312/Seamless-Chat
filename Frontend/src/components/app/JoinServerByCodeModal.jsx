import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiKey } from "react-icons/fi";
import React from "react";

function JoinServerByCodeModal({ isOpen, onClose, onJoinServer }) {
  const [code, setCode] = useState("");
  const [joiningServer, setJoiningServer] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanCode = code.trim();

    if (!cleanCode || joiningServer) return;

    setJoiningServer(true);

    try {
      if (onJoinServer) {
        const success = await onJoinServer(cleanCode);

        if (!success) {
          return;
        }
      }

      setCode("");

      onClose();
    } finally {
      setJoiningServer(false);
    }
  };

  const handleClose = () => {
    if (joiningServer) return;

    setCode("");
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
            {/* Close Button */}
            <button
              onClick={handleClose}
              disabled={joiningServer}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Close"
            >
              <FiX size={18} />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4 mb-6 mt-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-inner">
                <FiKey size={22} />
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Join a Private Server
                </h2>
                <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
                  Enter the invite code to join a private server.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Server Invite Code */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Invite Code <span className="text-rose-500">*</span>
                </label>

                <input
                  type="text"
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter server invite code..."
                  disabled={joiningServer}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white focus:border-indigo-500/50 focus:outline-none transition-all text-sm placeholder:text-gray-600 disabled:opacity-50"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={joiningServer}
                  className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!code.trim() || joiningServer}
                  className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-500 disabled:cursor-not-allowed font-semibold text-white text-sm transition-all shadow-md shadow-indigo-500/10"
                >
                  {joiningServer ? "Joining..." : "Join"}
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

export default React.memo(JoinServerByCodeModal);
