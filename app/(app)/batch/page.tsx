"use client";

import { useRouter } from "next/navigation";
import BatchPage from "@/components/BatchPage";

export default function Batch() {
  const router = useRouter();
  return <BatchPage onBack={() => router.push("/dashboard")} />;
}
