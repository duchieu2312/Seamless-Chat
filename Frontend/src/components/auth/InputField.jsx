export default function InputField({
  label,
  type = "text",
  name,
  placeholder,
  register,
  errors,
  validate,
}) {
  return (
    <div className="w-full">
      <label className="block text-[10px] uppercase tracking-[0.15em] font-bold text-slate-400 mb-1.5 ml-1">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        {...register(name, {
          required: `${label} is required`,
          validate,
        })}
        className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-slate-800 outline-none transition-all text-sm placeholder:text-slate-300"
      />

      {errors[name] && (
        <p className="text-red-500 text-[10px] mt-1 ml-1 font-medium italic">
          {errors[name].message}
        </p>
      )}
    </div>
  );
}
