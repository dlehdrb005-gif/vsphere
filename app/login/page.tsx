import { AuthPanel } from "@/components/auth-panel";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="admin-page">
        <AuthPanel mode="login" />
      </main>
    </>
  );
}
