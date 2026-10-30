import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: ReactNode;
};

export function Button({ className, variant = "secondary", icon, children, ...props }: Props) {
  return (
    <button
      className={clsx(
        "focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "accent-gradient text-white shadow-sm",
        variant === "secondary" && "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
        variant === "ghost" && "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
        variant === "danger" && "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
