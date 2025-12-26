import { motion, AnimatePresence } from "framer-motion";
import {
  FiMessageCircle,
  FiUserPlus,
  FiUserMinus,
  FiSlash,
  FiUnlock,
  FiAward,
  FiX,
} from "react-icons/fi";
import React from "react";
import { createPortal } from "react-dom";

function MemberActionModal({
  member,
  isOpen,
  onClose,
  friendshipStatus,
  isCurrentUserOwner,
  onChat,
  onAddFriend,
  onUnfriend,
  onBlock,
  onUnblock,
  onTransferOwnership,
}) {
  if (!member) return null;

  const isFriend = friendshipStatus === "accepted";
  const isBlockedByMe = friendshipStatus === "blocked_by_me";
  const isBlockedByThem = friendshipStatus === "blocked_by_them";
  const isPendingSent = friendshipStatus === "pending_sent";
  const isPendingReceived = friendshipStatus === "pending_received";

  const handleClose = () => {
    onClose();
  };

  const getStatusText = () => {
    if (isFriend) return "Friend";
    if (isBlockedByMe) return "Blocked";
    if (isBlockedByThem) return "Blocked you";
    if (isPendingSent) return "Request sent";
    if (isPendingReceived) return "Request received";

    return "Server member";
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
            transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1e293b] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl relative z-10 text-gray-100 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  member.username?.charAt(0).toUpperCase()
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">
                  {member.username}
                </h3>

                <p className="text-xs text-gray-500">{getStatusText()}</p>
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                title="Close"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Actions */}
            <div className="p-2">
              {/* Chat */}
              <button
                type="button"
                disabled={!isFriend}
                onClick={onChat}
                className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiMessageCircle size={18} />
                <span>Chat</span>
              </button>

              {/* Friend */}
              {isFriend ? (
                <button
                  type="button"
                  onClick={onUnfriend}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <FiUserMinus size={18} />
                  <span>Unfriend</span>
                </button>
              ) : isBlockedByMe || isBlockedByThem ? (
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 opacity-40 cursor-not-allowed"
                >
                  <FiUserPlus size={18} />
                  <span>Add Friend</span>
                </button>
              ) : isPendingSent ? (
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 opacity-40 cursor-not-allowed"
                >
                  <FiUserPlus size={18} />
                  <span>Request Sent</span>
                </button>
              ) : isPendingReceived ? (
                <button
                  type="button"
                  onClick={onAddFriend}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <FiUserPlus size={18} />
                  <span>Accept Friend</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onAddFriend}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <FiUserPlus size={18} />
                  <span>Add Friend</span>
                </button>
              )}

              {/* Block */}
              {isBlockedByMe ? (
                <button
                  type="button"
                  onClick={onUnblock}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
                >
                  <FiUnlock size={18} />
                  <span>Unblock</span>
                </button>
              ) : isBlockedByThem ? (
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 opacity-40 cursor-not-allowed"
                >
                  <FiSlash size={18} />
                  <span>Blocked</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onBlock}
                  className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <FiSlash size={18} />
                  <span>Block</span>
                </button>
              )}

              {/* Transfer Ownership */}
              {isCurrentUserOwner && !isBlockedByThem && (
                <>
                  <div className="my-2 border-t border-white/5" />

                  <button
                    type="button"
                    onClick={onTransferOwnership}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
                  >
                    <FiAward size={18} />
                    <span>Transfer Ownership</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default React.memo(MemberActionModal);
