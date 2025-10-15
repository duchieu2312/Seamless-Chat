import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axiosInstance from "../api/axiosInstance";
import defaultUserAvatar from "../assets/default-avatar.jpg";

export default function Channels() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem("user"));
  });

  useEffect(() => {
    const fetchUser = async () => {
      const res = await axiosInstance.get("/users/me");
      const freshUser = {
        id: res.data.id,
        username: res.data.username,
        avatarUrl: res.data.avatarUrl,
      };
      setUser(freshUser);
      localStorage.setItem("user", JSON.stringify(freshUser));
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } finally {
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h2 className="text-3xl font-bold">Welcome to Seamless-Chat</h2>
      {user && (
        <div className="text-center flex flex-col items-center gap-2">
          <img
            src={user.avatarUrl || defaultUserAvatar}
            alt="avatar"
            className="w-16 h-16 rounded-full object-cover"
          />
          <p className="text-xl">Hello, {user.username}</p>
        </div>
      )}
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
