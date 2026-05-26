import { PrismaClient, Role, EvaluatorType, WeightLevel } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const testUsers = [
    { email: "superadmin@eval.com", name: "Super Admin",          role: Role.SUPER_ADMIN,         password: "Admin1234!" },
    { email: "admin@eval.com",      name: "Admin",                role: Role.ADMIN,               password: "Admin1234!" },
    { email: "pedagogy@eval.com",   name: "Pedagogy Evaluator",   role: Role.PEDAGOGY_EVALUATOR,  password: "Evaluator1234!" },
    { email: "technical@eval.com",  name: "Technical Evaluator",  role: Role.TECHNICAL_EVALUATOR, password: "Evaluator1234!" },
    { email: "viewer@eval.com",     name: "Viewer",               role: Role.VIEWER,              password: "Viewer1234!" },
  ];

  for (const u of testUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, passwordHash: await hash(u.password, 12), role: u.role },
    });
  }

  const requirements = [
    // Compliance gate: FAIL immediately disqualifies the platform
    {
      title: "Data Protection Compliance",
      description: "Platform must demonstrate GDPR/UK GDPR compliance.",
      evaluatorType: EvaluatorType.COMPLIANCE,
      weight: WeightLevel.HIGH,
      isComplianceGate: true,
      category: "Compliance",
      order: 1,
    },
    {
      title: "Accessibility Standard",
      description: "Platform must meet WCAG 2.1 AA accessibility requirements.",
      evaluatorType: EvaluatorType.COMPLIANCE,
      weight: WeightLevel.HIGH,
      isComplianceGate: true,
      category: "Compliance",
      order: 2,
    },
    // Pedagogy requirements
    {
      title: "Curriculum Alignment",
      description: "Content maps clearly to national curriculum objectives.",
      evaluatorType: EvaluatorType.PEDAGOGY,
      weight: WeightLevel.HIGH,
      isComplianceGate: false,
      category: "Curriculum Alignment",
      order: 1,
    },
    {
      title: "Differentiation Support",
      description: "Platform supports differentiated learning paths.",
      evaluatorType: EvaluatorType.PEDAGOGY,
      weight: WeightLevel.MEDIUM,
      isComplianceGate: false,
      category: "Curriculum Alignment",
      order: 2,
    },
    {
      title: "Assessment & Feedback",
      description: "Built-in formative assessment tools with actionable feedback.",
      evaluatorType: EvaluatorType.PEDAGOGY,
      weight: WeightLevel.HIGH,
      isComplianceGate: false,
      category: "Assessment",
      order: 1,
    },
    // Technical requirements
    {
      title: "LTI Integration",
      description: "Supports LTI 1.3 for integration with VLEs.",
      evaluatorType: EvaluatorType.TECHNICAL,
      weight: WeightLevel.HIGH,
      isComplianceGate: false,
      category: "Interoperability",
      order: 1,
    },
    {
      title: "Data Export Standards",
      description: "Exports learner data in open, machine-readable formats (CSV, xAPI).",
      evaluatorType: EvaluatorType.TECHNICAL,
      weight: WeightLevel.MEDIUM,
      isComplianceGate: false,
      category: "Interoperability",
      order: 2,
    },
    {
      title: "API Availability",
      description: "REST or GraphQL API available for institutional integration.",
      evaluatorType: EvaluatorType.TECHNICAL,
      weight: WeightLevel.MEDIUM,
      isComplianceGate: false,
      category: "Interoperability",
      order: 3,
    },
    {
      title: "Uptime SLA",
      description: "Vendor guarantees ≥ 99.5% uptime with documented incident response.",
      evaluatorType: EvaluatorType.TECHNICAL,
      weight: WeightLevel.HIGH,
      isComplianceGate: false,
      category: "Reliability",
      order: 1,
    },
  ];

  // Wipe and repopulate so the seed stays idempotent without a unique key on title
  await prisma.requirement.deleteMany({});
  await prisma.requirement.createMany({ data: requirements });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
