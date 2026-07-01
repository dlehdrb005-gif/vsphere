import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ContactPayload = {
  name?: string;
  email?: string;
  company?: string;
  message?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as ContactPayload;

  if (!payload.name || !payload.email || !payload.message) {
    return NextResponse.json({ message: "이름, 이메일, 내용을 모두 입력해 주세요." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { message: "Supabase 환경변수가 아직 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("contact_messages").insert({
    name: payload.name,
    email: payload.email,
    company: payload.company || null,
    message: payload.message,
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "저장되었습니다." });
}
