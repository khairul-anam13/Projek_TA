import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Hanya path internal ("/foo"); tolak URL absolut dan "//host" supaya parameter `next` tidak jadi open redirect. */
export function safeNextPath(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

/** ID acak sederhana dengan prefix, mis. generateId("p") -> "p_a1b2c3d". */
export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}
