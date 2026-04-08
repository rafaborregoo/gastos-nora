import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[120px] w-full rounded-2xl border border-border bg-card px-4 py-3 text-base text-foreground shadow-sm placeholder:text-muted-foreground md:text-sm",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
