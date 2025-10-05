import { useState } from "react";
import { useForm } from "react-hook-form";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const onSubmit = (data) => {
    console.log(isLogin ? "Login Data:" : "Register Data:", data);
  };

  const password = watch("password");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-200 p-4 font-sans selection:bg-slate-800 selection:text-white">
      <div className="relative flex w-full max-w-4xl overflow-hidden rounded-3xl shadow-2xl bg-white min-h-162.5">
        <div
          className={`flex flex-1 flex-col items-center justify-center p-12 transition-all duration-500 ${!isLogin ? "opacity-0 -translate-x-5 pointer-events-none" : "opacity-100 translate-x-0"}`}
        >
          <h2 className="text-4xl font-extralight mb-8 text-slate-800 tracking-tight">
            Welcome Back
          </h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full max-w-xs space-y-4"
          >
            <InputField
              label="Email Address"
              type="email"
              name="email"
              placeholder="e.g. alex@example.com"
              register={register}
              errors={errors}
            />
            <InputField
              label="Password"
              type="password"
              name="password"
              placeholder="••••••••"
              register={register}
              errors={errors}
            />

            <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all cursor-pointer shadow-lg mt-4 active:scale-95">
              Sign In
            </button>
          </form>
          <button className="mt-6 text-slate-400 text-sm hover:text-slate-600 transition-colors cursor-pointer font-medium">
            Continue as Guest
          </button>
        </div>

        <div
          className={`flex flex-1 flex-col items-center justify-center p-12 transition-all duration-500 ${isLogin ? "opacity-0 translate-x-5 pointer-events-none" : "opacity-100 translate-x-0"}`}
        >
          <h2 className="text-4xl font-extralight mb-8 text-slate-800 tracking-tight">
            Create Account
          </h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-full max-w-xs space-y-3"
          >
            <InputField
              label="Username"
              name="username"
              placeholder="johndoe_99"
              register={register}
              errors={errors}
            />
            <InputField
              label="Email Address"
              type="email"
              name="email"
              placeholder="name@domain.com"
              register={register}
              errors={errors}
            />
            <InputField
              label="Password"
              type="password"
              name="password"
              placeholder="Min. 8 characters"
              register={register}
              errors={errors}
            />
            <InputField
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              placeholder="Repeat your password"
              register={register}
              errors={errors}
              validate={(val) => val === password || "Passwords do not match"}
            />
            <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all cursor-pointer shadow-lg mt-4 active:scale-95">
              Get Started
            </button>
          </form>
        </div>

        <div
          className={`absolute top-0 left-0 h-full w-1/2 bg-linear-to-br from-[#1e293b] to-[#0f172a] text-white flex flex-col items-center justify-center p-12 transition-all duration-700 ease-in-out z-10 shadow-2xl
          ${isLogin ? "translate-x-full rounded-l-[80px]" : "translate-x-0 rounded-r-[80px]"}`}
        >
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl rotate-12 group">
            <span className="text-3xl font-bold -rotate-12 transition-transform group-hover:scale-110">
              S
            </span>
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
      </div>
    </div>
  );
}

function InputField({
  label,
  type = "text",
  name,
  placeholder,
  register,
  errors,
  validate,
}) {
  return (
    <div className="w-full">
      <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400 mb-1.5 ml-1">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        {...register(name, { required: `${label} is required`, validate })}
        className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-slate-800 outline-none transition-all text-sm placeholder:text-slate-300"
      />
      {errors[name] && (
        <p className="text-red-500 text-[10px] mt-1 ml-1 font-medium">
          {errors[name].message}
        </p>
      )}
    </div>
  );
}
