"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ children }: { children: ReactNode }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#c6cfbd] bg-white px-4 text-sm font-semibold hover:bg-[#f7f8f3]"
    >
      {children}
    </button>
  );
}
