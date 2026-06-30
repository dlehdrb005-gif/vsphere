import { AuthButtons } from "@/components/auth-buttons";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#eef2e6] px-5 py-10 text-[#101410]">
      <section className="w-full max-w-md border border-[#c9d1c1] bg-white p-6 shadow-[0_24px_70px_rgba(21,37,20,0.12)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#637060]">VSPHERE Auth</p>
        <h1 className="mt-3 text-3xl font-semibold">계정으로 로그인</h1>
        <p className="mt-3 leading-7 text-[#4c594c]">
          Supabase Dashboard에서 GitHub와 Google Provider를 켜면 아래 버튼으로 바로 로그인됩니다.
        </p>
        <AuthButtons />
      </section>
    </main>
  );
}
