import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { useState } from "react";
import { toast } from "sonner";
import axiosInstance from "../../api/axiosInstance";
import InputField from "./InputField";

export default function LoginForm({ isVisible }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/login", {
        email: data.email,
        password: data.password,
      });

      localStorage.setItem("user", JSON.stringify(res.data.user));
      toast.success(res.data.message || "Welcome back!");
      navigate("/seamless-chat");
    } catch (err) {
      if (err.response?.status !== 429) {
        toast.error(err.response?.data?.message || "Login failed!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center p-12 transition-all duration-500 
      ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-5 pointer-events-none"}`}
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
          placeholder="name@domain.com"
          register={register}
          errors={errors}
        />
        <InputField
          label="Password"
          type="password"
          name="password"
          placeholder="Your password"
          register={register}
          errors={errors}
        />
        <button
          disabled={loading}
          className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
