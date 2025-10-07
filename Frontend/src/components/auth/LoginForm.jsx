import { useForm } from "react-hook-form";
import InputField from "./InputField";

export default function LoginForm({ isVisible }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = (data) => console.log("Login Data:", data);

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
        <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-all cursor-pointer">
          Sign In
        </button>
      </form>
    </div>
  );
}
