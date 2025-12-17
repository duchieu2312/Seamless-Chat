import { useEffect, useState } from "react";
import { toast } from "sonner";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";
import AuthBanner from "../components/auth/AuthBanner";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    const sessionExpired = localStorage.getItem("sessionExpired");

    if (sessionExpired) {
      toast.error("Session expired. Please sign in again.");
      localStorage.removeItem("sessionExpired");
    }
  }, []);

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
