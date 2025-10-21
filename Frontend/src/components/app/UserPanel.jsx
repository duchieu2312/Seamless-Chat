import { useState, useEffect, useRef } from "react";
import { FiMic, FiMicOff, FiHeadphones, FiLogOut } from "react-icons/fi";
import React from "react";

const STATUS_CONFIG = {
  online: { label: "Online", color: "bg-green-500", desc: "Available to chat" },
  idle: { label: "Idle", color: "bg-amber-500", desc: "Away from keyboard" },
  dnd: {
    label: "Do Not Disturb",
    color: "bg-red-500",
    desc: "Mute notifications",
  },
  invisible: {
    label: "Invisible",
    color: "bg-gray-400",
    desc: "Appear offline to others",
  },
};

function UserPanel({ user, onLogout, getAvatarColor, onStatusChange }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);

  const [currentStatus, setCurrentStatus] = useState(() => {
    return localStorage.getItem("seamless_user_status") || "online";
  });

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsStatusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMicToggle = () => {
    setIsMuted((prev) => !prev);
  };

  const handleDeafenToggle = () => {
    setIsDeafened((prev) => {
      const nextState = !prev;
      if (nextState) setIsMuted(true);
      return nextState;
    });
  };

  const handleStatusSelect = (statusKey) => {
    setCurrentStatus(statusKey);
    localStorage.setItem("seamless_user_status", statusKey);
    setIsStatusMenuOpen(false);

    if (onStatusChange) {
      onStatusChange(statusKey);
    }
  };

  return (
    <div className="w-full h-16 bg-[#111827]/90 backdrop-blur-xl border-t border-white/5 px-3 flex items-center justify-between flex-shrink-0 select-none relative isolate z-50">
      {/* ==========================================
          AVATAR, USERNAME & ONLINE STATUS
         ========================================== */}
      <div
        ref={menuRef}
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer p-1 hover:bg-white/5 rounded-xl transition-all relative group"
        onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
        title="Click to change status"
      >
        <div className="relative flex-shrink-0">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(user?.username || "?")} flex items-center justify-center font-bold text-white text-sm select-none`}
            >
              {user?.username?.charAt(0).toUpperCase() || "?"}
            </div>
          )}

          <div
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 ${STATUS_CONFIG[currentStatus].color} rounded-full border-2 border-[#1e293b] transition-all duration-300 shadow-sm`}
          />
        </div>

        <div className="text-sm min-w-0 pr-2">
          <div className="font-semibold truncate text-gray-200 group-hover:text-white transition-colors">
            {user?.username || "Guest"}
          </div>
          <div className="text-xs text-gray-400 leading-tight capitalize">
            {STATUS_CONFIG[currentStatus].label}
          </div>
        </div>

        {/* ==========================================
            STATUS CONFIGURATION DROPDOWN MENU
           ========================================== */}
        {isStatusMenuOpen && (
          <div className="absolute bottom-18 left-1 w-64 bg-[#1e293b] border border-white/10 rounded-2xl p-2 shadow-2xl z-[99999] shadow-black/80 transition-all duration-150">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1.5 border-b border-white/5 mb-1">
              Set Status
            </p>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusSelect(key);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                  currentStatus === key
                    ? "bg-white/10 text-white"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div
                  className={`w-3 h-3 ${config.color} rounded-full flex-shrink-0`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{config.label}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {config.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ==========================================
          ACTION CONTROLS (MIC, HEADPHONES, LOGOUT)
         ========================================== */}
      <div className="flex gap-0.5 flex-shrink-0">
        <button
          onClick={handleMicToggle}
          className={`p-2 rounded-lg transition-colors group relative ${isMuted ? "bg-red-500/10" : "hover:bg-white/5"}`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <FiMicOff size={16} className="text-red-400" />
          ) : (
            <FiMic
              size={16}
              className="text-gray-400 group-hover:text-white transition-colors"
            />
          )}
        </button>

        <button
          onClick={handleDeafenToggle}
          className={`p-2 rounded-lg transition-colors group relative ${isDeafened ? "bg-red-500/10" : "hover:bg-white/5"}`}
          title={isDeafened ? "Undeafen" : "Deafen"}
        >
          <FiHeadphones
            size={16}
            className={`transition-colors ${isDeafened ? "text-red-400" : "text-gray-400 group-hover:text-white"}`}
          />
          {isDeafened && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-5 h-[2px] bg-red-400 rotate-45 mt-[2px]" />
            </div>
          )}
        </button>

        <button
          onClick={onLogout}
          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
          title="Log Out"
        >
          <FiLogOut
            size={16}
            className="text-gray-400 group-hover:text-red-400 transition-colors"
          />
        </button>
      </div>
    </div>
  );
}

export default React.memo(UserPanel);
