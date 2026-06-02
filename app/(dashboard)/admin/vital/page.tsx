import { redirect } from "next/navigation";
import { GraduationCapIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { canDo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { VitalAdmin } from "@/components/vital/admin/VitalAdmin";

export default async function VitalAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canDo(session.user.role, "manage:vital")) redirect("/dashboard");

  const [tools, recommendations, levels, skills, imports, platforms] = await Promise.all([
    prisma.vitalTool.findMany({
      orderBy: [{ isAssessmentTool: "asc" }, { name: "asc" }],
      include: { pillarRatings: true, skillCoverage: true, levelMappings: true },
    }),
    prisma.vitalRecommendation.findMany({
      include: { skill: true, level: true, coreTool: true, suppTool: true },
    }),
    prisma.vitalLevel.findMany({ orderBy: { order: "asc" } }),
    prisma.vitalSkill.findMany({ orderBy: { order: "asc" } }),
    prisma.vitalImportLog.findMany({
      orderBy: { importedAt: "desc" },
      take: 10,
      include: { importedBy: { select: { name: true, email: true } } },
    }),
    // TOOL-track platforms a VITAL tool can be linked to (drives the results-dashboard VITAL filters).
    prisma.platform.findMany({
      where: { track: { not: "VITAL" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, vendor: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        icon={GraduationCapIcon}
        kicker="VITAL Administration"
        title="VITAL Admin"
        description="Manage tools, recommendations, levels and skills. Import workbooks with change review."
      />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <VitalAdmin
          tools={tools}
          recommendations={recommendations}
          levels={levels}
          skills={skills}
          platforms={platforms}
          imports={imports.map((i) => ({
            id: i.id,
            fileName: i.fileName,
            workbookType: i.workbookType,
            created: i.created,
            updated: i.updated,
            skipped: i.skipped,
            importedAt: i.importedAt.toISOString(),
            by: i.importedBy.name ?? i.importedBy.email,
          }))}
        />
      </main>
    </div>
  );
}
