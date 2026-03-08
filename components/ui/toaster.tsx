"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useUIStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 max-w-lg mx-auto">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

interface ToastProps {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
  onClose: () => void;
}

function Toast({ id, type, message, duration = 4000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColors = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500",
  };

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg text-white shadow-lg animate-in slide-in-from-bottom-5",
        bgColors[type]
      )}
    >
      <span className="text-lg">{icons[type]}</span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
