import { FiUsers } from "react-icons/fi";
import React from "react";

function SidebarMember({ computedServerRoster, getAvatarColor }) {
  const renderMember = (member, isOwner = false) => (
    <div
      key={member.id}
      className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all group"
    >
      <div className="relative w-8 h-8 flex-shrink-0">
        {member.avatarUrl ? (
          <img
            src={member.avatarUrl}
            alt={member.username}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div
            className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(
              member.username,
            )} flex items-center justify-center font-bold text-white text-xs`}
          >
            {member.username?.charAt(0).toUpperCase()}
          </div>
        )}

        <div
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#1e293b]
          ${
            member.status === "online"
              ? "bg-green-500"
              : member.status === "idle"
                ? "bg-yellow-500"
                : "bg-gray-500"
          }`}
        />
      </div>

      <span
        className={`font-medium truncate flex-1 transition-colors
          ${
            isOwner
              ? "text-amber-400 group-hover:text-amber-300"
              : "text-gray-300 group-hover:text-gray-100"
          }`}
      >
        {member.username}
      </span>
    </div>
  );

  return (
    <div className="w-60 min-w-[240px] max-w-[240px] bg-black/15 border-l border-white/5 flex flex-col h-full select-none flex-shrink-0">
      {/* Header */}
      <div className="h-14 px-4 border-b border-white/5 bg-black/10 flex items-center gap-2 text-xs font-bold text-white tracking-wider uppercase">
        <FiUsers size={14} />
        <span>Total Members — {computedServerRoster.totalCount}</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar text-sm">
        {computedServerRoster.owners.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-amber-500 tracking-wider uppercase">
              Owner — {computedServerRoster.owners.length}
            </h4>

            <div className="space-y-1">
              {computedServerRoster.owners.map((member) =>
                renderMember(member, true),
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-[11px] font-bold text-gray-300 tracking-wider uppercase">
            Members — {computedServerRoster.standardMembers.length}
          </h4>

          <div className="space-y-1">
            {computedServerRoster.standardMembers.map((member) =>
              renderMember(member),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(SidebarMember);
