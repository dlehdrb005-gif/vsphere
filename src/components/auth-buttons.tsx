"use client";

import { Code2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Provider = "github" | "google";

export function AuthButtons() {
  async function signIn(provider: Provider) {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
  }

  return (
    <div className="mt-7 grid gap-3">
      <button
        type="button"
        onClick={() => signIn("github")}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#0f2818] px-5 text-sm font-semibold text-white hover:bg-[#1e3a26]"
      >
        <Code2 size={18} />
        GitHub로 계속하기
      </button>
      <button
        type="button"
        onClick={() => signIn("google")}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[#c6cfbd] bg-white px-5 text-sm font-semibold hover:bg-[#f7f8f3]"
      >
        <Mail size={18} />
        Google로 계속하기
      </button>
    </div>
  );
}
