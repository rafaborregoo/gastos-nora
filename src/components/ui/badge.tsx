import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const intentClasses = {
  neutral: "bg-muted text-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  danger: "bg-danger/15 text-danger",
  info: "bg-accent/15 text-accent"
} as const;

export function Badge({
  className,
  intent = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { intent?: keyof typeof intentClasses }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        intentClasses[intent],
        className
      )}
      {...props}
    />
  );
}

