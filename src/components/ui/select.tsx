import * as React from "react";

import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-12 w-full appearance-none rounded-2xl border border-border bg-card px-4 py-2 text-base text-foreground shadow-sm md:text-sm",
      className
    )}
    {...props}
  >
    {children}
  </select>
));

Select.displayName = "Select";
