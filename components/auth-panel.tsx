"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "signup";

export function AuthPanel({ mode }: { mode: AuthMode }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (!supabase) {
      setMessage("Supabase 환경변수가 설정되지 않았습니다.");
      setLoading(false);
      return;
    }

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setMessage(result.error.message);
      setLoading(false);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setMessage("가입 확인 메일을 확인해 주세요. 확인 후 로그인할 수 있습니다.");
      setLoading(false);
      return;
    }

    window.location.href = "/boards";
  }

  async function signInWithProvider(provider: "google" | "github") {
    if (!supabase) {
      setMessage("Supabase 환경변수가 설정되지 않았습니다.");
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <section className="admin-shell auth-shell">
      <p className="eyebrow">VSPHERE ACCOUNT</p>
      <h1>{mode === "signup" ? "회원가입" : "로그인"}</h1>
      <p>{mode === "signup" ? "계정을 만들고 게시글을 작성하세요." : "계정으로 로그인하면 글을 작성할 수 있습니다."}</p>

      <form className="admin-login-form" onSubmit={handleSubmit}>
        <label>
          <span>이메일</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          <span>비밀번호</span>
          <input name="password" type="password" required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        </label>
        {message ? <strong className="form-error">{message}</strong> : null}
        <div className="admin-actions">
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "처리 중" : mode === "signup" ? "가입하기" : "로그인"}
          </button>
          <Link className="ghost-button" href={mode === "signup" ? "/login" : "/signup"}>
            {mode === "signup" ? "이미 계정이 있어요" : "회원가입"}
          </Link>
        </div>
      </form>

      <div className="admin-actions auth-provider-row">
        <button className="ghost-button" type="button" onClick={() => signInWithProvider("google")}>
          Google 로그인
        </button>
        <button className="ghost-button" type="button" onClick={() => signInWithProvider("github")}>
          GitHub 로그인
        </button>
      </div>
    </section>
  );
}
