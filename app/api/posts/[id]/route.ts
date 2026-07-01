import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";
import { extractBearerToken, getCurrentUser } from "@/lib/posts";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ message: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("vsphere_posts")
    .select("id,user_id,category,title,content,status,author_name,created_at,updated_at")
    .eq("id", Number(params.id))
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ message: "게시글을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const token = extractBearerToken(request);
  const user = await getCurrentUser(token ?? undefined);

  if (!token || !user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = createSupabaseClient(token);

  if (!supabase) {
    return NextResponse.json({ message: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 500 });
  }

  const { error } = await supabase.from("vsphere_posts").delete().eq("id", Number(params.id)).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
