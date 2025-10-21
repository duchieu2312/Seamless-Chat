import { useState, useEffect } from "react";

export default function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem("user");
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
      return null;
    }
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const cached = localStorage.getItem("user");
      setUser(cached ? JSON.parse(cached) : null);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return { user, setUser };
}
