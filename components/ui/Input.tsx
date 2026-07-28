import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-sm text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400",
        "focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-sm text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 resize-none",
      "focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
