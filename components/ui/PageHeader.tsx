import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
  className?: string;
  sticky?: boolean;
  containerClassName?: string;
}

/**
 * Shared sticky top bar: brand logo/title (or custom title) + optional back
 * button on the left, arbitrary content slotted on the right. Used by every
 * page except LoginPage, whose header sits inside a two-column hero layout
 * rather than as a full-width bar.
 */
export function PageHeader({
  title,
  subtitle,
  onBack,
  backLabel = "Kembali",
  right,
  className,
  sticky = true,
  containerClassName,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "bg-white border-b border-stone-200 h-16 flex items-center shrink-0 z-40",
        sticky && "sticky top-0",
        className
      )}
    >
      <div
        className={cn(
          "max-w-6xl mx-auto px-5 w-full flex items-center justify-between gap-4",
          containerClassName
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-stone-100 text-stone-500 transition-colors shrink-0 cursor-pointer"
              title={backLabel}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm shrink-0">
              <img src="/pagefree.png" alt="Page Free" className="w-full h-full object-cover bg-white" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-base text-stone-900 tracking-tight block truncate">
                {title ?? (
                  <>
                    Page<span className="text-brand-600">Free</span>
                  </>
                )}
              </span>
              {subtitle && <span className="text-[11px] text-stone-400 block truncate">{subtitle}</span>}
            </div>
          </div>
        </div>
        {right && <div className="flex items-center gap-3 shrink-0">{right}</div>}
      </div>
    </header>
  );
}
