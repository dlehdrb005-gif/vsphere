"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, getAdminPassword } from "./auth";

export async function loginAdmin(formData: FormData) {
  const configuredPassword = getAdminPassword();
  const password = String(formData.get("password") ?? "");

  if (!configuredPassword) {
    redirect("/admin?error=missing-password");
  }

  if (password !== configuredPassword) {
    redirect("/admin?error=invalid-password");
  }

  cookies().set(ADMIN_COOKIE, configuredPassword, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
  });

  redirect("/admin");
}

export async function logoutAdmin() {
  cookies().delete(ADMIN_COOKIE);
  redirect("/admin");
}
