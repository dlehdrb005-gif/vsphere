"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        company: formData.get("company"),
        message: formData.get("message"),
      }),
    });

    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      setStatus("error");
      setMessage(payload.message ?? "저장 중 문제가 발생했습니다.");
      return;
    }

    form.reset();
    setStatus("success");
    setMessage("문의가 Supabase에 저장되었습니다.");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 border border-[#d3dacb] bg-[#f8faf4] p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          이름
          <input
            name="name"
            required
            className="h-11 rounded-md border border-[#c6cfbd] bg-white px-3 font-normal outline-none focus:border-[#315f3a]"
            placeholder="홍길동"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          이메일
          <input
            name="email"
            type="email"
            required
            className="h-11 rounded-md border border-[#c6cfbd] bg-white px-3 font-normal outline-none focus:border-[#315f3a]"
            placeholder="name@example.com"
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        회사/팀
        <input
          name="company"
          className="h-11 rounded-md border border-[#c6cfbd] bg-white px-3 font-normal outline-none focus:border-[#315f3a]"
          placeholder="VSPHERE"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold">
        내용
        <textarea
          name="message"
          required
          rows={5}
          className="resize-none rounded-md border border-[#c6cfbd] bg-white px-3 py-3 font-normal outline-none focus:border-[#315f3a]"
          placeholder="필요한 기능이나 문의 내용을 입력하세요."
        />
      </label>
      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#0f2818] px-5 text-sm font-semibold text-white hover:bg-[#1e3a26] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send size={17} />
        {status === "loading" ? "저장 중" : "문의 저장"}
      </button>
      {message ? (
        <p className={status === "error" ? "text-sm font-medium text-red-700" : "text-sm font-medium text-[#227236]"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
