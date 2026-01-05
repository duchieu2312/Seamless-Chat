import { useState, useEffect } from "react";

export default function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      const cachedUser = localStorage.getItem("user");
      return cachedUser ? JSON.parse(cachedUser) : null;
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
      return null;
    }
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const cachedUser = localStorage.getItem("user");
      setUser(cachedUser ? JSON.parse(cachedUser) : null);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return { user, setUser };
}
