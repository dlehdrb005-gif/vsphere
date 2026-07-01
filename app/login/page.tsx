import { AuthPanel } from "@/components/auth-panel";

export default function LoginPage() {
  return (
    <main className="admin-page">
      <AuthPanel mode="login" />
    </main>
  );
}
