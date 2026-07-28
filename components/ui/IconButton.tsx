import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-lg transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0",
  {
    variants: {
      variant: {
        default: "text-stone-500 hover:text-stone-900 hover:bg-stone-100",
        active: "text-brand-700 bg-brand-50 border border-brand-200",
        destructive: "text-stone-400 hover:text-rose-600 hover:bg-rose-50",
      },
      size: {
        sm: "w-6 h-6",
        md: "w-8 h-8",
        lg: "w-10 h-10",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(iconButtonVariants({ variant, size }), className)} {...props} />
  )
);
IconButton.displayName = "IconButton";
