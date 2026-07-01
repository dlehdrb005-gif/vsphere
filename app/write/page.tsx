import { SiteHeader } from "@/components/site-header";
import { WriteForm } from "@/components/write-form";

export default function WritePage() {
  return (
    <>
      <SiteHeader />
      <main className="admin-page">
        <WriteForm />
      </main>
    </>
  );
}
