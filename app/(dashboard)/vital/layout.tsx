import { redirect } from "next/navigation";
import { CompassIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { canDo } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/PageHeader";
import { VitalNav } from "@/components/vital/VitalNav";

export default async function VitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canDo(session.user.role, "view:vital")) redirect("/dashboard");

  return (
    <div className="flex flex-col">
      <PageHeader
        icon={CompassIcon}
        kicker="VITAL Framework"
        title="VITAL"
        description="Visible learning · Inclusive pedagogy · right Technology · Assessment for learning · Learner agency."
      />

      <div className="sticky top-0 z-20 border-b border-stone-200/80 bg-white shadow-sm">
        <div className="container mx-auto max-w-7xl px-6">
          <VitalNav />
        </div>
      </div>

      <main className="container mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
