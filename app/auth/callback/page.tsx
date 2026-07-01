"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("로그인을 마무리하고 있습니다.");

  useEffect(() => {
    async function finish() {
      if (!supabase) {
        setMessage("Supabase 환경변수가 설정되지 않았습니다.");
        return;
      }

      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(error.message);
          return;
        }
      }

      window.location.href = "/boards";
    }

    finish();
  }, []);

  return (
    <>
      <SiteHeader />
      <main className="admin-page">
        <section className="admin-shell auth-shell">
          <p className="eyebrow">AUTH CALLBACK</p>
          <h1>{message}</h1>
          <Link className="ghost-button" href="/boards">게시판으로 이동</Link>
        </section>
      </main>
    </>
  );
}
