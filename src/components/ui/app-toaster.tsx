"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      richColors
      closeButton
      position="top-center"
      toastOptions={{
        className: "rounded-2xl border border-border bg-card text-card-foreground shadow-soft"
      }}
    />
  );
}

