"use client";

import { AppProvider } from "@/lib/appContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}
