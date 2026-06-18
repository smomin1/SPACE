import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCapIcon, MilestoneIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { canDo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/PageHeader";
import { VitalAdmin } from "@/components/vital/admin/VitalAdmin";
import { CefrQuestionsAdmin } from "@/components/admin/cefr/CefrQuestionsAdmin";
import { cn } from "@/lib/utils";

export default async function VitalAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canDo(session.user.role, "manage:vital")) redirect("/dashboard");

  const { tab } = await searchParams;
  const activeTab = tab === "cefr" ? "cefr" : "vital";

  const [tools, recommendations, levels, skills, imports, platforms, cefrLevels, cefrSkills, cefrQuestions] =
    await Promise.all([
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
      prisma.platform.findMany({
        where: {
          track: { not: "VITAL" },
          OR: [
            { evaluations: { some: { state: "FINALISED" } } },
            { vitalTools: { some: {} } },
          ],
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, vendor: true },
      }),
      prisma.cefrLevel.findMany({ orderBy: { order: "asc" }, select: { id: true, code: true, label: true } }),
      prisma.cefrSkill.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true, group: true } }),
      prisma.cefrQuestion.findMany({
        orderBy: [{ level: { order: "asc" } }, { skill: { order: "asc" } }, { num: "asc" }],
        select: {
          id: true, levelId: true, skillId: true, num: true, text: true, quickReference: true,
          level: { select: { code: true } },
          skill: { select: { name: true } },
        },
      }),
    ]);

  return (
    <div>
      <PageHeader
        icon={GraduationCapIcon}
        kicker="Administration"
        title="Manage VITAL & CEFR"
        description="Manage VITAL tools and CEFR evaluation questions."
      />
      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Tab bar */}
        <div className="mb-6 flex gap-1 border-b border-stone-200">
          <Link
            href="/admin/vital"
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px",
              activeTab === "vital"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-stone-500 hover:text-emerald-700",
            )}
          >
            <GraduationCapIcon className="size-3.5" />
            VITAL
          </Link>
          <Link
            href="/admin/vital?tab=cefr"
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px",
              activeTab === "cefr"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-stone-500 hover:text-emerald-700",
            )}
          >
            <MilestoneIcon className="size-3.5" />
            CEFR Questions
          </Link>
        </div>

        {activeTab === "vital" && (
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
        )}

        {activeTab === "cefr" && (
          <CefrQuestionsAdmin
            questions={cefrQuestions}
            levels={cefrLevels}
            skills={cefrSkills}
          />
        )}
      </main>
    </div>
  );
}
