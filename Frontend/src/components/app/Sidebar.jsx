import { motion } from "framer-motion";
import { FiHome, FiPlus } from "react-icons/fi";
import React from "react";

function Sidebar({
  currentSpace,
  onHomeClick,
  servers,
  activeServer,
  onServerClick,
  getAvatarColor,
  onOpenCreateServer,
}) {
  return (
    <div className="w-[80px] min-w-[80px] max-w-[80px] basis-[80px] flex-shrink-0 bg-black/20 backdrop-blur-xl border-r border-white/5 flex flex-col items-center py-4 gap-3 relative z-50">
      {/* ==========================================
          HOME NAVIGATION BUTTON
         ========================================== */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onHomeClick}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all relative group
        ${
          currentSpace !== "SERVER"
            ? "bg-indigo-500 shadow-lg shadow-indigo-500/50 text-white"
            : "bg-white/5 hover:bg-indigo-500 text-gray-400 hover:text-white backdrop-blur-md"
        }`}
      >
        <FiHome size={24} />

        {/* Left Indicator Pillar */}
        {currentSpace !== "SERVER" && (
          <motion.div
            layoutId="activeNav"
            className="absolute -left-1 w-1 h-8 bg-white rounded-r-full"
          />
        )}

        {/* Hover Tooltip */}
        <div className="absolute left-full ml-3 px-3 py-2 bg-[#111214] border border-white/10 rounded-lg text-sm font-medium text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] shadow-xl">
          Home
        </div>
      </motion.button>
      {/* Divider */}
      <div className="w-8 h-px bg-white/10 my-1" />
      {/* ==========================================
          SERVER LIST NAVIGATION
         ========================================== */}
      {servers.map((server) => {
        const isActive =
          activeServer === server.id && currentSpace === "SERVER";
        return (
          <motion.button
            key={server.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onServerClick(server.id)}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl transition-all relative group
            ${
              isActive
                ? "shadow-lg shadow-indigo-500/50"
                : "hover:bg-white/5 transition-colors"
            }`}
          >
            {/* Check if Server has a Custom Icon Image */}
            {server.iconUrl ? (
              <img
                src={server.iconUrl}
                alt={server.name}
                className="w-14 h-14 rounded-2xl object-cover"
              />
            ) : (
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarColor(server.name)} flex items-center justify-center font-bold text-white text-xl select-none relative`}
              >
                {server.name?.charAt(0).toUpperCase() || "?"}

                {/* Overlay background on hover inside the icon circle */}
                <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-white/10 transition-colors" />
              </div>
            )}

            {/* Left Indicator Pillar for Server Workspace */}
            {isActive && (
              <motion.div
                layoutId="activeNav"
                className="absolute -left-1 w-1 h-8 bg-white rounded-r-full"
              />
            )}

            {/* Hover Tooltip displaying Server Name */}
            <div className="absolute left-full ml-3 px-3 py-2 bg-[#111214] border border-white/10 rounded-lg text-sm font-medium text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[9999] shadow-xl">
              {server.name}
            </div>
          </motion.button>
        );
      })}
      {/* ==========================================
            ACTION BUTTON: CREATE SERVER
           ========================================== */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onOpenCreateServer}
        className="w-14 h-14 min-h-[56px] rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all border border-white/10 relative group"
      >
        <span className="transition-transform duration-200 group-hover:rotate-90 flex items-center justify-center">
          <FiPlus size={24} />
        </span>

        <div className="absolute left-full ml-3 px-3 py-2 bg-[#111214] border border-white/10 rounded-lg text-sm font-medium text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[9999] shadow-xl">
          Add a Server
        </div>
      </motion.button>
    </div>
  );
}

export default React.memo(Sidebar);
