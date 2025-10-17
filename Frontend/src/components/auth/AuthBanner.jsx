import logo from "../../assets/logo.png";

export default function AuthBanner({ isLogin, setIsLogin }) {
  return (
    <div
      className={`absolute top-0 left-0 h-full w-1/2 bg-linear-to-br from-[#1e293b] to-[#0f172a] text-white flex flex-col items-center justify-center p-12 transition-all duration-700 ease-in-out z-10 shadow-2xl
      ${isLogin ? "translate-x-full rounded-l-[80px]" : "translate-x-0 rounded-r-[80px]"}`}
    >
      <div className="w-20 h-20 bg-white border border-white/20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl group p-3 overflow-hidden">
        <img
          src={logo}
          alt="Logo"
          className="w-full h-full object-contain transition-transform group-hover:scale-110"
        />
      </div>

      <h1 className="text-3xl font-bold mb-2 tracking-tighter">
        Seamless-Chat
      </h1>

      <p className="text-slate-400 text-center mb-12 font-light text-sm px-4">
        {isLogin
          ? "New here? Start your journey with us today."
          : "Already have an account? Jump back in."}
      </p>

      <button
        onClick={() => setIsLogin(!isLogin)}
        className="px-10 py-3 border border-slate-500 rounded-full font-bold hover:bg-white hover:text-slate-900 transition-all cursor-pointer active:scale-90"
      >
        {isLogin ? "Create Account" : "Sign In"}
      </button>
    </div>
  );
}
