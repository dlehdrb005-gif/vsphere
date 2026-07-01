import { NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase";
import { extractBearerToken, getCurrentUser, type PostCategory } from "@/lib/posts";

const allowedCategories: PostCategory[] = ["free", "clip", "promo", "notice"];

export async function GET() {
  const supabase = createSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ data: [] });
  }

  const { data, error } = await supabase
    .from("vsphere_posts")
    .select("id,user_id,category,title,content,status,author_name,created_at,updated_at")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const token = extractBearerToken(request);
  const user = await getCurrentUser(token ?? undefined);

  if (!token || !user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json()) as {
    category?: PostCategory;
    title?: string;
    content?: string;
  };

  const category = allowedCategories.includes(body.category as PostCategory) ? body.category : "free";
  const title = body.title?.trim();
  const content = body.content?.trim();

  if (!title || !content) {
    return NextResponse.json({ message: "제목과 내용을 입력해 주세요." }, { status: 400 });
  }

  const supabase = createSupabaseClient(token);

  if (!supabase) {
    return NextResponse.json({ message: "Supabase 환경변수가 설정되지 않았습니다." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("vsphere_posts")
    .insert({
      user_id: user.id,
      category,
      title,
      content,
      author_name: user.user_metadata?.name ?? user.email,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
