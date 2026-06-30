import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Code2,
  Cpu,
  Database,
  Globe2,
  Lock,
  ServerCog,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ContactForm } from "@/components/contact-form";

const features = [
  {
    icon: ServerCog,
    title: "인프라 통합 관리",
    description: "서버, 클러스터, 워크로드 상태를 한 화면에서 확인하고 운영 흐름을 정리합니다.",
  },
  {
    icon: ShieldCheck,
    title: "보안 중심 설계",
    description: "Supabase Auth와 Row Level Security를 전제로 사용자 데이터 접근을 분리합니다.",
  },
  {
    icon: Database,
    title: "실시간 데이터 기반",
    description: "문의, 계정, 운영 이벤트를 DB에 저장하고 대시보드에서 확장할 수 있습니다.",
  },
];

const stats = [
  ["Auth", "GitHub / Google"],
  ["DB", "Supabase Postgres"],
  ["Frontend", "Next.js App Router"],
  ["Deploy", "Vercel Ready"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f7f2] text-[#101410]">
      <section className="relative overflow-hidden border-b border-[#d9ded0] bg-[#eef2e6]">
        <div className="mx-auto grid min-h-[92vh] max-w-7xl grid-cols-1 gap-10 px-5 py-6 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:py-8">
          <div className="flex flex-col justify-between gap-12">
            <nav className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3" aria-label="VSphere home">
                <span className="grid size-10 place-items-center rounded-md bg-[#0f2818] text-white">
                  <Boxes size={21} />
                </span>
                <span className="text-xl font-semibold tracking-[0.08em]">VSPHERE</span>
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[#c6cdbc] bg-white px-3 text-sm font-medium hover:bg-[#f7f8f3]"
                >
                  <Lock size={16} />
                  로그인
                </Link>
              </div>
            </nav>

            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-[#b7c1ad] bg-white/75 px-3 py-2 text-sm font-medium text-[#334235]">
                <Sparkles size={16} />
                Supabase Auth + Postgres 연결 준비 완료
              </div>
              <h1 className="text-5xl font-semibold leading-[1.04] tracking-normal text-[#102316] sm:text-6xl lg:text-7xl">
                VSPHERE
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#3f4a40] sm:text-xl">
                클라우드 운영, 계정 인증, 문의 데이터까지 하나로 이어지는 v스피어 웹 플랫폼입니다.
                GitHub와 Google 로그인, Supabase DB, 서버 API가 바로 확장 가능한 구조로 준비되어 있습니다.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#0f2818] px-5 text-sm font-semibold text-white hover:bg-[#1e3a26]"
                >
                  로그인 연결 확인
                  <ArrowRight size={17} />
                </Link>
                <a
                  href="#contact"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[#bfc8b5] bg-white px-5 text-sm font-semibold hover:bg-[#f7f8f3]"
                >
                  DB 저장 테스트
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-4">
              {stats.map(([label, value]) => (
                <div key={label} className="border-t border-[#c9d1c1] pt-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#627060]">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-[#182318]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex min-h-[520px] items-center justify-center lg:min-h-0">
            <div className="absolute inset-x-8 top-8 h-20 rounded-[50%] border border-[#c3cdb9] bg-white/40" />
            <div className="relative w-full max-w-xl border border-[#aeb9a3] bg-[#fbfcf8] p-4 shadow-[0_28px_80px_rgba(21,37,20,0.16)]">
              <div className="mb-4 flex items-center justify-between border-b border-[#d6ddcf] pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7b6c]">
                    Live Console
                  </p>
                  <p className="mt-1 text-lg font-semibold">VSPHERE Control</p>
                </div>
                <span className="rounded-md bg-[#dff3d9] px-2 py-1 text-xs font-semibold text-[#1c5a28]">
                  Online
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3">
                  {["Auth", "Database", "API"].map((item, index) => (
                    <div key={item} className="rounded-md border border-[#d5dccd] bg-white p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{item}</span>
                        <CheckCircle2 size={17} className="text-[#227236]" />
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-[#e9eee3]">
                        <div
                          className="h-2 rounded-full bg-[#315f3a]"
                          style={{ width: `${76 + index * 7}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-md border border-[#d5dccd] bg-[#122016] p-4 text-white">
                  <div className="grid grid-cols-3 gap-2">
                    {[Cpu, Globe2, Code2, Database, ShieldCheck, ServerCog].map((Icon, index) => (
                      <div
                        key={index}
                        className="grid aspect-square place-items-center rounded-md border border-white/10 bg-white/8"
                      >
                        <Icon size={24} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 space-y-3 text-sm text-[#d9e4d3]">
                    <p className="font-mono">auth.providers = github, google</p>
                    <p className="font-mono">db.table = contact_messages</p>
                    <p className="font-mono">api.route = /api/contact</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="border border-[#d3dacb] bg-white p-6">
              <feature.icon size={28} className="text-[#315f3a]" />
              <h2 className="mt-5 text-xl font-semibold">{feature.title}</h2>
              <p className="mt-3 leading-7 text-[#4c594c]">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="contact" className="border-y border-[#d9ded0] bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#637060]">Database Test</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">문의 저장까지 연결되는 백엔드</h2>
            <p className="mt-4 leading-8 text-[#4c594c]">
              Supabase 환경변수를 입력하고 SQL 스키마를 적용하면, 이 폼의 데이터가
              `contact_messages` 테이블에 저장됩니다.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
