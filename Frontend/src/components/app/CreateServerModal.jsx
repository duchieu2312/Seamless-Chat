import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import React from "react";

function CreateServerModal({ isOpen, onClose, onCreateServer }) {
  const [serverName, setServerName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!serverName.trim()) return;

    if (onCreateServer) {
      onCreateServer({
        name: serverName.trim(),
        iconUrl: null,
      });
    }
    setServerName("");
    onClose();
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
            className="bg-[#1e293b] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl relative z-10 text-gray-100 overflow-hidden"
          >
            {/* Close Button Anchor */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
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
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Server Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Seamless Team"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white focus:border-indigo-500/50 focus:outline-none transition-all text-sm placeholder:text-gray-600"
                />
              </div>

              {/* Action Buttons Interface */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!serverName.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-500 disabled:cursor-not-allowed font-semibold text-white text-sm transition-all shadow-md shadow-indigo-500/10"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default React.memo(CreateServerModal);
