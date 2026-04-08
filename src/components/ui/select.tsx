import * as React from "react";

import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-2xl border border-border bg-card px-4 py-2 text-sm text-foreground shadow-sm",
      className
    )}
    {...props}
  >
    {children}
  </select>
));

Select.displayName = "Select";

