import { Navigate } from "react-router";
import { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";

export default function ProtectedRoute({ children }) {
  const [isAuth, setIsAuth] = useState(null);

  const cachedUser = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    axiosInstance
      .get("/users/me")
      .then((res) => {
        setIsAuth(true);
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: res.data.id,
            username: res.data.username,
            avatarUrl: res.data.avatarUrl,
          }),
        );
      })
      .catch(() => {
        setIsAuth(false);
        localStorage.removeItem("user");
      });
  }, []);

  if (isAuth === null && !cachedUser)
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  if (isAuth === false) return <Navigate to="/" replace />;

  return children;
}
