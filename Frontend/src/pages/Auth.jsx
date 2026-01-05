import { Navigate } from "react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";
import AuthBanner from "../components/auth/AuthBanner";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  const cachedUser = localStorage.getItem("user");

  useEffect(() => {
    const authError = localStorage.getItem("authError");

    if (authError) {
      toast.error(authError);
      localStorage.removeItem("authError");
    }
  }, []);

  if (cachedUser) {
    return <Navigate to="/seamless-chat" replace />;
  }

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
