import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TYPE_STYLES: Record<ToastType, string> = {
  success: "border-l-success",
  error: "border-l-danger",
  info: "border-l-line-strong",
};

const TYPE_ICONS: Record<ToastType, "check-circle" | "x-circle" | "info"> = {
  success: "check-circle",
  error: "x-circle",
  info: "info",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toastState, setToastState] = useState<ToastItem | null>(null);
  const idRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++idRef.current;
    setToastState({ id, type, message });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setToastState((cur) => (cur?.id === id ? null : cur));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toastState ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center px-4 md:bottom-8">
          <div
            key={toastState.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-md border border-line border-l-[3px] bg-panel px-4 py-3 text-sm text-ink shadow-pop animate-slide-up ${TYPE_STYLES[toastState.type]}`}
          >
            <Icon name={TYPE_ICONS[toastState.type]} size={16} />
            <span className="min-w-0">{toastState.message}</span>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): { toast: ToastContextValue["toast"] } {
  const ctx = useContext(ToastContext);
  return { toast: ctx?.toast ?? (() => {}) };
}