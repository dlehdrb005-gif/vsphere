import { createSupabaseClient, supabase } from "@/lib/supabase";

export type PostCategory = "free" | "clip" | "promo" | "notice";

export type Post = {
  id: number;
  user_id: string;
  category: PostCategory;
  title: string;
  content: string;
  status: "published" | "hidden";
  author_name: string | null;
  created_at: string;
  updated_at: string;
};

export async function getPosts() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("vsphere_posts")
    .select("id,user_id,category,title,content,status,author_name,created_at,updated_at")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) return [];

  return (data ?? []) as Post[];
}

export async function getPost(id: number) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("vsphere_posts")
    .select("id,user_id,category,title,content,status,author_name,created_at,updated_at")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error) return null;

  return data as Post | null;
}

export async function getCurrentUser(accessToken?: string) {
  const client = createSupabaseClient(accessToken);
  if (!client || !accessToken) return null;

  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error) return null;

  return user;
}

export function extractBearerToken(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const [scheme, token] = auth.split(" ");

  if (scheme.toLowerCase() !== "bearer" || !token) return null;

  return token;
}
