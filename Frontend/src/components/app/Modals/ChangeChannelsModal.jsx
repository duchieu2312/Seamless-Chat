import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiX,
  FiHash,
  FiVolume2,
  FiEdit2,
  FiTrash2,
  FiPlus,
} from "react-icons/fi";
import React from "react";

function ChangeChannelsModal({
  isOpen,
  onClose,
  textChannels = [],
  voiceChannels = [],
  onCreateChannel,
  onRenameChannel,
  onDeleteChannel,
}) {
  const [editingChannel, setEditingChannel] = useState(null);
  const [channelName, setChannelName] = useState("");
  const [addingChannelType, setAddingChannelType] = useState(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setEditingChannel(null);
    setChannelName("");
    setAddingChannelType(null);
    setNewChannelName("");
  }, [isOpen]);

  const handleStartAdding = (type) => {
    if (processing) return;

    setEditingChannel(null);
    setChannelName("");
    setAddingChannelType(type);
    setNewChannelName("");
  };

  const handleCancelAdding = () => {
    if (processing) return;

    setAddingChannelType(null);
    setNewChannelName("");
  };

  const handleCreate = async () => {
    const cleanName = newChannelName.trim();

    if (!cleanName || processing || !addingChannelType) return;

    setProcessing(true);

    try {
      const success = await onCreateChannel(addingChannelType, cleanName);

      if (!success) return;

      setAddingChannelType(null);
      setNewChannelName("");
    } finally {
      setProcessing(false);
    }
  };

  const handleStartEditing = (channel) => {
    if (processing) return;

    setAddingChannelType(null);
    setNewChannelName("");
    setEditingChannel(channel);
    setChannelName(channel.name);
  };

  const handleCancelEditing = () => {
    if (processing) return;

    setEditingChannel(null);
    setChannelName("");
  };

  const handleRename = async () => {
    const cleanName = channelName.trim();

    if (!cleanName || processing || !editingChannel) return;

    setProcessing(true);

    try {
      const success = await onRenameChannel(editingChannel.id, cleanName);

      if (!success) return;

      setEditingChannel(null);
      setChannelName("");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (channel) => {
    if (processing) return;

    setProcessing(true);

    try {
      await onDeleteChannel(channel.id);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (processing) return;

    setEditingChannel(null);
    setChannelName("");
    setAddingChannelType(null);
    setNewChannelName("");
    onClose();
  };

  const renderAddChannel = (type) => {
    if (addingChannelType !== type) return null;

    return (
      <div className="flex items-center gap-2 px-3 py-2">
        {type === "text" ? (
          <FiHash className="text-gray-400 flex-shrink-0" size={18} />
        ) : (
          <FiVolume2 className="text-gray-400 flex-shrink-0" size={18} />
        )}

        <input
          autoFocus
          value={newChannelName}
          onChange={(e) => setNewChannelName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCreate();
            }

            if (e.key === "Escape") {
              handleCancelAdding();
            }
          }}
          disabled={processing}
          placeholder="Channel name"
          className="flex-1 min-w-0 bg-[#0f172a] border border-indigo-500/50 rounded-md px-2 py-1.5 text-sm text-gray-100 outline-none placeholder:text-gray-500"
        />

        <button
          type="button"
          onClick={handleCreate}
          disabled={processing || !newChannelName.trim()}
          className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50"
        >
          Create
        </button>

        <button
          type="button"
          onClick={handleCancelAdding}
          disabled={processing}
          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-white/10 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  };

  const renderChannel = (channel, type) => {
    const isEditing = editingChannel?.id === channel.id;

    return (
      <div
        key={channel.id}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 group"
      >
        {type === "text" ? (
          <FiHash className="text-gray-400 flex-shrink-0" size={18} />
        ) : (
          <FiVolume2 className="text-gray-400 flex-shrink-0" size={18} />
        )}

        {isEditing ? (
          <input
            autoFocus
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRename();
              }

              if (e.key === "Escape") {
                handleCancelEditing();
              }
            }}
            disabled={processing}
            className="flex-1 min-w-0 bg-[#0f172a] border border-indigo-500/50 rounded-md px-2 py-1 text-sm text-gray-100 outline-none"
          />
        ) : (
          <span
            className="flex-1 min-w-0 text-sm text-gray-200 truncate"
            title={channel.name}
          >
            {channel.name}
          </span>
        )}

        {isEditing ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRename}
              disabled={processing || !channelName.trim()}
              className="px-2 py-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
            >
              Save
            </button>

            <button
              type="button"
              onClick={handleCancelEditing}
              disabled={processing}
              className="px-2 py-1 text-xs font-medium text-gray-400 hover:text-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => handleStartEditing(channel)}
              disabled={processing}
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50"
              title="Rename channel"
            >
              <FiEdit2 size={15} />
            </button>

            <button
              type="button"
              onClick={() => handleDelete(channel)}
              disabled={processing}
              className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-50"
              title="Delete channel"
            >
              <FiTrash2 size={15} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1e293b] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl relative z-10 text-gray-100 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Change Channels</h2>

              <button
                type="button"
                onClick={handleClose}
                disabled={processing}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-1">
              {/* Text Channels */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Text Channels
                  </h3>

                  <button
                    type="button"
                    onClick={() => handleStartAdding("text")}
                    disabled={processing}
                    className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50"
                    title="Add text channel"
                  >
                    <FiPlus size={16} />
                  </button>
                </div>

                <div className="space-y-1">
                  {textChannels.map((channel) =>
                    renderChannel(channel, "text"),
                  )}

                  {renderAddChannel("text")}
                </div>
              </section>

              {/* Voice Channels */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Voice Channels
                  </h3>

                  <button
                    type="button"
                    onClick={() => handleStartAdding("voice")}
                    disabled={processing}
                    className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50"
                    title="Add voice channel"
                  >
                    <FiPlus size={16} />
                  </button>
                </div>

                <div className="space-y-1">
                  {voiceChannels.map((channel) =>
                    renderChannel(channel, "voice"),
                  )}

                  {renderAddChannel("voice")}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="flex justify-end mt-6 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={handleClose}
                disabled={processing}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/10 disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default React.memo(ChangeChannelsModal);
