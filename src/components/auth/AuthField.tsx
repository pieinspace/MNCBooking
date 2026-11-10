import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  icon: ReactNode;
  error: string | undefined;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ id, label, icon, error, type, className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (visible ? "text" : "password") : type;

    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          >
            {icon}
          </span>
          <input
            {...props}
            ref={ref}
            id={id}
            type={inputType}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              "h-12 w-full rounded-xl border bg-white pl-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10",
              isPassword ? "pr-11" : "pr-3.5",
              error ? "border-red-400" : "border-slate-200",
              className,
            )}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setVisible((current) => !current)}
              className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>
        {error && (
          <p id={`${id}-error`} className="text-xs font-medium text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);

AuthField.displayName = "AuthField";
