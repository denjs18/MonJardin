"use client";

import { useCallback } from "react";
import { useUIStore } from "@/lib/store";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

export function useToast() {
  const { addToast } = useUIStore();

  const toast = useCallback(
    ({ title, description, variant = "default", duration }: ToastOptions) => {
      const type = variant === "destructive" ? "error" : "success";
      const message = description ? `${title}: ${description}` : title || "";

      addToast({
        type,
        message,
        duration,
      });
    },
    [addToast]
  );

  return { toast };
}
