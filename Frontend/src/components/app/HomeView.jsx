import { motion } from "framer-motion";
import logo from "../../assets/logo.svg";

const HOME_STEPS = [
  {
    step: "1",
    title: "Discover Communities",
    desc: "Browse public communities or create your own workspace to start collaborating.",
  },
  {
    step: "2",
    title: "Join a Server",
    desc: "Join communities that interest you and instantly access their channels and members.",
  },
  {
    step: "3",
    title: "Explore Text & Voice Channels",
    desc: "Chat in text channels, share ideas, or hop into voice channels for real-time conversations.",
  },
  {
    step: "4",
    title: "Build Your Friend Network",
    desc: "Search users by username, send friend requests, and stay connected through Direct Messages.",
  },
  {
    step: "5",
    title: "Stay in Sync",
    desc: "Receive real-time messages, unread notifications, and presence updates without refreshing.",
  },
  {
    step: "6",
    title: "Make It Yours",
    desc: "Customize your profile, manage your servers, and enjoy a seamless communication experience.",
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
            <div className="flex items-center gap-6">
              <img
                src={logo}
                alt="Logo"
                className="w-20 h-20 object-contain flex-shrink-0"
              />
              <div>
                <h1 className="text-4xl font-bold mb-4 tracking-tight">
                  Welcome to Seamless-Chat
                </h1>
                <p className="text-gray-300 text-lg">
                  Real-time messaging platform built for teams and communities
                </p>
              </div>
            </div>
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
