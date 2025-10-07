import { useForm } from "react-hook-form";
import InputField from "./InputField";

export default function RegisterForm({ isVisible }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch("password");

  const onSubmit = (data) => console.log("Register Data:", data);

  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center p-12 transition-all duration-500 
          ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-5 pointer-events-none"}`}
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
          placeholder="username123"
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
          validate={(val) =>
            val.length >= 8 || "Password must be at least 8 characters"
          }
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
  );
}
