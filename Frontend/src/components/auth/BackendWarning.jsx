import { useEffect, useState } from "react";
import { FiAlertTriangle } from "react-icons/fi";

const WARNING_KEY = "backend_warning_shown";

export default function BackendWarning() {
  const [visible, setVisible] = useState(
    () => !sessionStorage.getItem(WARNING_KEY),
  );

  useEffect(() => {
    if (!visible) return;

    sessionStorage.setItem(WARNING_KEY, "true");

    const timer = setTimeout(() => {
      setVisible(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-5 left-5 z-[9999] w-[min(340px,calc(100vw-40px))] rounded-xl border border-amber-500/40 bg-zinc-900 p-4 text-zinc-100 shadow-xl">
      <div className="flex items-center gap-2">
        <FiAlertTriangle className="shrink-0 text-xl text-amber-400" />

        <h3 className="text-sm font-semibold text-amber-400">
          Backend Startup Notice
        </h3>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
        The backend may take up to 10 seconds to start on your first connection.
        Please wait while the server wakes up.
      </p>
    </div>
  );
}
