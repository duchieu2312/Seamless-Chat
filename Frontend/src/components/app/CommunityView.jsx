import { motion } from "framer-motion";
import { FiSearch } from "react-icons/fi";
import { toast } from "sonner";

export default function CommunityView({
  communitySearch = "",
  setCommunitySearch,
  communities = [],
  getAvatarColor,
}) {
  const filteredCommunities = communities.filter((c) =>
    c.name.toLowerCase().includes(communitySearch.toLowerCase()),
  );

  return (
    <div className="flex-1 overflow-y-auto p-8 select-none">
      <div className="max-w-4xl mx-auto">
        {/* Header Title & Search Controls */}
        <h2 className="text-3xl font-bold mb-6 text-gray-100">
          Discover Communities
        </h2>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <div className="relative">
            <FiSearch
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              size={20}
            />
            <input
              type="text"
              value={communitySearch}
              onChange={(e) => setCommunitySearch(e.target.value)}
              placeholder="Search public communities..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Community Discovery Cards Workspace Grid */}
        {filteredCommunities.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No public communities matching your search were found.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredCommunities.map((server) => (
              <motion.div
                key={server.name}
                whileHover={{ scale: 1.05 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getAvatarColor ? getAvatarColor(server.name) : "from-indigo-500 to-purple-500"} flex items-center justify-center font-bold text-white text-2xl mb-4`}
                  >
                    {server.name ? server.name[0].toUpperCase() : "?"}
                  </div>
                  <h3 className="font-bold text-lg mb-1 text-gray-200">
                    {server.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 h-10 leading-relaxed">
                    {server.description || "No description provided."}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-2">
                  <span className="text-xs text-gray-500 font-medium">
                    {server.members?.toLocaleString() || 0} members
                  </span>
                  <button
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                      server.joined
                        ? "bg-white/10 hover:bg-white/20 text-gray-300"
                        : "bg-indigo-500 hover:bg-indigo-600 text-white"
                    }`}
                    onClick={() =>
                      toast.success(
                        server.joined
                          ? "You have already joined this community"
                          : `Successfully joined ${server.name}!`,
                      )
                    }
                  >
                    {server.joined ? "Joined" : "Join Server"}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
