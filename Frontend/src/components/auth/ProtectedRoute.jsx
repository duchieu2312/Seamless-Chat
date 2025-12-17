import { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import logo from "../../assets/Logo.svg";

export default function ProtectedRoute({ children }) {
  const [isAuth, setIsAuth] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await axiosInstance.get("/users/me");

        setIsAuth(true);

        localStorage.setItem(
          "user",
          JSON.stringify({
            id: data.id,
            username: data.username,
            avatarUrl: data.avatarUrl,
          }),
        );
      } catch {
        setIsAuth(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuth === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center w-12 h-12">
            <div className="absolute inset-0 border-4 border-white/10 border-t-indigo-400 rounded-full animate-spin" />
            <img
              src={logo}
              alt="Logo"
              className="w-8 h-8 object-contain flex-shrink-0"
            />
          </div>

          <span className="text-sm font-medium text-gray-300">Loading...</span>
        </div>
      </div>
    );
  }

  if (isAuth === false) {
    return null;
  }

  return children;
}
