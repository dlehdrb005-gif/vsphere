"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function WriteForm() {
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (!supabase) {
      setMessage("Supabase 환경변수가 설정되지 않았습니다.");
      setLoading(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("로그인 후 글을 작성할 수 있습니다.");
      setLoading(false);
      return;
    }

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        category: form.get("category"),
        title: form.get("title"),
        content: form.get("content"),
      }),
    });

    const payload = (await response.json()) as { id?: number; message?: string };

    if (!response.ok || !payload.id) {
      setMessage(payload.message ?? "게시글 저장에 실패했습니다.");
      setLoading(false);
      return;
    }

    window.location.href = `/boards/${payload.id}`;
  }

  if (email === null) {
    return (
      <section className="admin-shell auth-shell">
        <p className="eyebrow">LOGIN REQUIRED</p>
        <h1>글 작성은 로그인 후 가능합니다</h1>
        <div className="admin-actions">
          <Link className="primary-button" href="/login">로그인</Link>
          <Link className="ghost-button" href="/signup">회원가입</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <p className="eyebrow">WRITE POST</p>
      <h1>게시글 작성</h1>
      <p>{email} 계정으로 작성 중입니다.</p>
      <form className="admin-login-form write-form" onSubmit={handleSubmit}>
        <label>
          <span>분류</span>
          <select name="category" defaultValue="free">
            <option value="free">자유</option>
            <option value="clip">클립</option>
            <option value="promo">홍보</option>
            <option value="notice">공지 제안</option>
          </select>
        </label>
        <label>
          <span>제목</span>
          <input name="title" required maxLength={120} />
        </label>
        <label>
          <span>내용</span>
          <textarea name="content" required rows={10} />
        </label>
        {message ? <strong className="form-error">{message}</strong> : null}
        <div className="admin-actions">
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "저장 중" : "게시하기"}
          </button>
          <Link className="ghost-button" href="/boards">목록</Link>
        </div>
      </form>
    </section>
  );
}
