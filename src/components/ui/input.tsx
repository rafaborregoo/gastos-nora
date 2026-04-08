import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-12 w-full rounded-2xl border border-border bg-card px-4 py-2 text-base text-foreground shadow-sm placeholder:text-muted-foreground md:text-sm",
      className
    )}
    {...props}
  />
));

Input.displayName = "Input";
