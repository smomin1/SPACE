import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { canDo } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { VitalEvaluatorWorkspace } from "@/components/vital/VitalEvaluatorWorkspace";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VitalEvaluatePage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    include: {
      platform: true,
      assignments: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!evaluation) notFound();
  if (evaluation.platform.track !== "VITAL") redirect(`/evaluate/${id}`);

  const myAssignment = evaluation.assignments.find((a) => a.userId === session.user.id);
  const isAdmin = canDo(session.user.role, "manage:vital");
  if (!myAssignment && !isAdmin) redirect("/evaluations");

  const [tool, skills, levels] = await Promise.all([
    prisma.vitalTool.findFirst({
      where: { platformId: evaluation.platformId },
      include: { pillarRatings: true, skillCoverage: true, levelMappings: true },
    }),
    prisma.vitalSkill.findMany({ orderBy: { order: "asc" } }),
    prisma.vitalLevel.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/evaluations">← Evaluations</Link>
        </Button>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-amber-700">
            VITAL evaluation
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{evaluation.platform.name}</h1>
          <p className="text-muted-foreground">{evaluation.platform.vendor}</p>
        </div>
      </div>

      <VitalEvaluatorWorkspace
        evaluationId={evaluation.id}
        platformName={evaluation.platform.name}
        state={evaluation.state}
        locked={!!evaluation.lockedAt}
        hasSubmitted={myAssignment?.hasSubmitted ?? false}
        tool={tool}
        skills={skills}
        levels={levels}
      />
    </div>
  );
}
