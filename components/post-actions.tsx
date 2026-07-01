"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function PostActions({ postId, userId }: { postId: number; userId: string }) {
  const [canEdit, setCanEdit] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => {
      setCanEdit(data.user?.id === userId);
    });
  }, [userId]);

  async function deletePost() {
    if (!supabase) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const response = await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      setMessage(payload.message ?? "삭제 실패");
      return;
    }

    window.location.href = "/boards";
  }

  if (!canEdit) return null;

  return (
    <div className="admin-actions post-actions">
      <button className="ghost-button" type="button" onClick={deletePost}>
        삭제
      </button>
      {message ? <strong className="form-error">{message}</strong> : null}
    </div>
  );
}
