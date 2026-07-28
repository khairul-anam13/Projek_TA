import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-bold px-2 py-0.5 text-[10px] border whitespace-nowrap",
  {
    variants: {
      status: {
        success: "bg-emerald-50 text-emerald-700 border-emerald-100",
        warning: "bg-amber-50 text-amber-600 border-amber-100",
        neutral: "bg-stone-100 text-stone-500 border-stone-200",
        danger: "bg-rose-50 text-rose-600 border-rose-100",
        brand: "bg-brand-50 text-brand-700 border-brand-100",
      },
    },
    defaultVariants: { status: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, status, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ status }), className)} {...props} />;
}

export { badgeVariants };
