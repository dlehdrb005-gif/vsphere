import { AuthPanel } from "@/components/auth-panel";

export default function SignupPage() {
  return (
    <main className="admin-page">
      <AuthPanel mode="signup" />
    </main>
  );
}
