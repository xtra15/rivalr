import { type InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  assistiveLabel?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", assistiveLabel, ...props }) => (
    <input
      {...props}
      className={`w-full rounded-md border border-line-strong bg-panel px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint
        transition-colors hover:border-ink-muted focus:outline-none focus:border-volt focus:ring-2 focus:ring-volt/20
        ${className}`}
      aria-label={assistiveLabel}
    />
  ),
);

Input.displayName = "Input";