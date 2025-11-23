import { motion } from "framer-motion";
import { FiHome, FiPlus } from "react-icons/fi";
import React, { useState } from "react";

function Sidebar({
  currentSpace,
  onHomeClick,
  servers,
  activeServer,
  onServerClick,
  getAvatarColor,
  onOpenCreateServer,
}) {
  const [hoveredServer, setHoveredServer] = useState(null);

  return (
    <div className="w-[80px] min-w-[80px] max-w-[80px] basis-[80px] flex-shrink-0 bg-black/20 backdrop-blur-xl border-r border-white/5 flex flex-col items-center py-4 relative z-50 overflow-visible">
      {/* ==========================================
          HOME NAVIGATION
         ========================================== */}
      <div className="flex-shrink-0 flex flex-col items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onHomeClick}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors relative group
          ${
            currentSpace !== "SERVER"
              ? "bg-indigo-500 shadow-lg shadow-indigo-500/50 text-white"
              : "bg-white/5 hover:bg-indigo-500 text-gray-400 hover:text-white backdrop-blur-md"
          }`}
        >
          <FiHome size={24} />

          {/* Active Indicator */}
          {currentSpace !== "SERVER" && (
            <div className="absolute -left-1.5 w-1.5 h-8 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.35)]" />
          )}

          {/* Hover Tooltip */}
          <div className="absolute left-full ml-3 px-3 py-2 bg-[#111214] border border-white/10 rounded-lg text-sm font-medium text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] shadow-xl">
            Home
          </div>
        </motion.button>

        {/* Divider */}
        <div className="w-8 h-px bg-white/10 my-1" />
      </div>

      {/* ==========================================
          SERVER LIST
         ========================================== */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-visible flex flex-col items-center gap-3 py-1 scrollbar-hide">
        {servers.map((server) => {
          const isActive =
            activeServer === server.id && currentSpace === "SERVER";

          return (
            <motion.button
              key={server.id}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onServerClick(server.id)}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();

                setHoveredServer({
                  id: server.id,
                  name: server.name,
                  top: rect.top + rect.height / 2,
                  left: rect.right + 12,
                });
              }}
              onMouseLeave={() => {
                setHoveredServer(null);
              }}
              className={`w-14 h-14 min-h-[56px] flex-shrink-0 rounded-2xl flex items-center justify-center font-bold text-xl transition-colors relative group
        ${isActive ? "shadow-lg shadow-indigo-500/50" : "hover:bg-white/5"}`}
            >
              {/* Server Icon */}
              {server.iconUrl ? (
                <img
                  src={server.iconUrl}
                  alt={server.name}
                  className="w-14 h-14 rounded-2xl object-cover"
                />
              ) : (
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarColor(
                    server.name,
                  )} flex items-center justify-center font-bold text-white text-xl select-none`}
                >
                  {server.name?.charAt(0).toUpperCase() || "?"}
                </div>
              )}

              {/* Active Indicator */}
              {isActive && (
                <div className="absolute -left-1.5 w-1.5 h-8 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.35)]" />
              )}
            </motion.button>
          );
        })}
      </div>
      {/* Hover Tooltip */}
      {hoveredServer && (
        <div
          className="fixed px-3 py-2 bg-[#111214] border border-white/10 rounded-lg text-sm font-medium text-gray-200 whitespace-nowrap pointer-events-none z-[99999] shadow-xl"
          style={{
            top: hoveredServer.top,
            left: hoveredServer.left,
            transform: "translateY(-50%)",
          }}
        >
          {hoveredServer.name}
        </div>
      )}

      {/* ==========================================
          CREATE SERVER
         ========================================== */}
      <div className="flex-shrink-0 pt-3">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenCreateServer}
          className="w-14 h-14 min-h-[56px] rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-colors border border-white/10 relative group"
        >
          <span className="transition-transform duration-200 group-hover:rotate-90 flex items-center justify-center">
            <FiPlus size={24} />
          </span>

          {/* Hover Tooltip */}
          <div className="absolute left-full ml-3 px-3 py-2 bg-[#111214] border border-white/10 rounded-lg text-sm font-medium text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] shadow-xl">
            Create a Server
          </div>
        </motion.button>
      </div>
    </div>
  );
}

export default React.memo(Sidebar);
