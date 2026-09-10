import { type InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  assistiveLabel?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", assistiveLabel, ...props }) => (
    <input
      {...props}
      className={`w-full rounded-xl border border-navy-700 bg-navy-900 px-3.5 py-2.5 text-sm text-white placeholder:text-navy-500
        transition-colors hover:border-navy-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25
        ${className}`}
      aria-label={assistiveLabel}
    />
  ),
);

Input.displayName = "Input";