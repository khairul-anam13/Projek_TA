import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-stone-200 bg-white",
        hover && "transition-all hover:border-stone-300 hover:shadow-md",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";
