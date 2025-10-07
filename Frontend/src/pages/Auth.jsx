import { useState } from "react";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";
import AuthBanner from "../components/auth/AuthBanner";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-200 p-4 font-sans">
      <div className="relative flex w-full max-w-4xl overflow-hidden rounded-3xl shadow-2xl bg-white min-h-162.5">
        <AuthBanner isLogin={isLogin} setIsLogin={setIsLogin} />
        <LoginForm isVisible={isLogin} />
        <RegisterForm isVisible={!isLogin} />
      </div>
    </div>
  );
}
