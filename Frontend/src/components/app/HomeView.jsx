import { motion } from "framer-motion";
import { HiSparkles } from "react-icons/hi2";

const HOME_STEPS = [
  {
    step: "1",
    title: "Create or Join a Server",
    desc: "Click the + button to create your own server or join with an invite link",
  },
  {
    step: "2",
    title: "Explore Channels",
    desc: "Text channels for messaging, voice channels for real-time audio",
  },
  {
    step: "3",
    title: "Add Friends",
    desc: "Go to People tab to search and add friends by username",
  },
  {
    step: "4",
    title: "Customize Workspace",
    desc: "Change your avatar, status, and notification settings",
  },
];

export default function HomeView() {
  return (
    <div className="flex-1 overflow-y-auto p-8 select-none">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Welcome Banner Banner */}
          <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-6">
            <HiSparkles className="text-indigo-400 mb-4" size={48} />
            <h1 className="text-4xl font-bold mb-4 tracking-tight">
              Welcome to Seamless-Chat
            </h1>
            <p className="text-gray-300 text-lg">
              Real-time messaging platform built for teams and communities
            </p>
          </div>

          {/* Onboarding On-steps Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {HOME_STEPS.map((item) => (
              <div
                key={item.step}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold mb-3 text-white">
                  {item.step}
                </div>
                <h3 className="font-bold text-lg mb-2 text-gray-100">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
