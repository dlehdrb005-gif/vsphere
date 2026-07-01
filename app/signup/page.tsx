import { AuthPanel } from "@/components/auth-panel";
import { SiteHeader } from "@/components/site-header";

export default function SignupPage() {
  return (
    <>
      <SiteHeader />
      <main className="admin-page">
        <AuthPanel mode="signup" />
      </main>
    </>
  );
}
