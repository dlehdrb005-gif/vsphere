import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7f2] px-5 py-8 text-[#101410]">
        <section className="w-full max-w-xl border border-[#d3dacb] bg-white p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#637060]">Setup Required</p>
          <h1 className="mt-3 text-3xl font-semibold">Supabase 환경변수가 필요합니다</h1>
          <p className="mt-4 leading-7 text-[#4c594c]">
            `.env.example`을 `.env.local`로 복사한 뒤 Supabase URL과 anon key를 입력하면
            로그인된 사용자 대시보드가 표시됩니다.
          </p>
        </section>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("display_name, email").eq("id", user.id).maybeSingle();

  return (
    <main className="min-h-screen bg-[#f6f7f2] px-5 py-8 text-[#101410]">
      <section className="mx-auto max-w-5xl border border-[#d3dacb] bg-white p-6">
        <div className="flex flex-col justify-between gap-5 border-b border-[#d9ded0] pb-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#637060]">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold">환영합니다</h1>
          </div>
          <SignOutButton>
            <LogOut size={17} />
            로그아웃
          </SignOutButton>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="border border-[#d3dacb] bg-[#f8faf4] p-5">
            <p className="text-sm font-semibold text-[#637060]">User ID</p>
            <p className="mt-2 break-all font-mono text-sm">{user.id}</p>
          </div>
          <div className="border border-[#d3dacb] bg-[#f8faf4] p-5">
            <p className="text-sm font-semibold text-[#637060]">Email</p>
            <p className="mt-2 break-all text-sm">{profile?.email ?? user.email}</p>
          </div>
          <div className="border border-[#d3dacb] bg-[#f8faf4] p-5">
            <p className="text-sm font-semibold text-[#637060]">Name</p>
            <p className="mt-2 text-sm">{profile?.display_name ?? user.user_metadata?.name ?? "No name"}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
