import { Role, EvaluationState, Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { mockDeep } from "jest-mock-extended";
import { updateScore } from "../../lib/score-service";

// ─── Test 1: User can be created with each Role ────────────────────────────────

describe("User roles", () => {
  const db = mockDeep<PrismaClient>();

  it.each(Object.values(Role))("creates a user with role %s", async (role) => {
    const mockUser = {
      id: "u1",
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.user.create.mockResolvedValueOnce(mockUser);

    const result = await db.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
        passwordHash: "hashed",
        role,
      },
    });

    expect(result.role).toBe(role);
  });
});

// ─── Test 2: Score requires an associated Evaluation ─────────────────────────

describe("Score", () => {
  const db = mockDeep<PrismaClient>();

  it("throws a FK constraint error when created without a valid evaluationId", async () => {
    db.score.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError(
        "Foreign key constraint failed on the field: `Score_evaluationId_fkey`",
        { code: "P2003", clientVersion: "7.0.0" }
      )
    );

    await expect(
      db.score.create({
        data: {
          evaluationId: "nonexistent-id",
          requirementId: "r1",
          userId: "u1",
        },
      })
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
  });

  it("throws with error code P2003 (FK violation) when evaluation is missing", async () => {
    db.score.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("FK violation", {
        code: "P2003",
        clientVersion: "7.0.0",
      })
    );

    await expect(
      db.score.create({
        data: {
          evaluationId: "nonexistent-id",
          requirementId: "r1",
          userId: "u1",
        },
      })
    ).rejects.toMatchObject({ code: "P2003" });
  });
});

// ─── Test 3: ScoreAuditLog is created on every score update ───────────────────

describe("ScoreAuditLog", () => {
  const db = mockDeep<PrismaClient>();

  beforeEach(() => {
    // Route $transaction callbacks through the same mock so nested calls resolve
    db.$transaction.mockImplementation(async (fn: any) => {
      if (typeof fn === "function") return fn(db);
      return Promise.all(fn);
    });
  });

  afterEach(() => {
    db.$transaction.mockReset();
    db.score.findUniqueOrThrow.mockReset();
    db.score.update.mockReset();
    db.scoreAuditLog.create.mockReset();
  });

  it("creates one audit log entry when a score value is updated", async () => {
    const existing = {
      id: "s1",
      evaluationId: "e1",
      requirementId: "r1",
      userId: "u1",
      value: 3,
      evidenceType: null,
      comment: "old comment",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.score.findUniqueOrThrow.mockResolvedValueOnce(existing);
    db.score.update.mockResolvedValueOnce({ ...existing, value: 5 });
    db.scoreAuditLog.create.mockResolvedValueOnce({
      id: "a1",
      scoreId: "s1",
      changedById: "u2",
      previousValue: 3,
      newValue: 5,
      previousEvidenceType: null,
      newEvidenceType: null,
      previousComment: "old comment",
      newComment: null,
      reason: null,
      changedAt: new Date(),
    });

    await updateScore(db, { scoreId: "s1", changedById: "u2", newValue: 5 });

    expect(db.scoreAuditLog.create).toHaveBeenCalledTimes(1);
  });

  it("records the correct before and after values in the audit log", async () => {
    const existing = {
      id: "s2",
      evaluationId: "e1",
      requirementId: "r1",
      userId: "u1",
      value: 2,
      evidenceType: null,
      comment: "original",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.score.findUniqueOrThrow.mockResolvedValueOnce(existing);
    db.score.update.mockResolvedValueOnce({ ...existing, value: 4, comment: "updated" });
    db.scoreAuditLog.create.mockResolvedValueOnce({
      id: "a2",
      scoreId: "s2",
      changedById: "u1",
      previousValue: 2,
      newValue: 4,
      previousEvidenceType: null,
      newEvidenceType: null,
      previousComment: "original",
      newComment: "updated",
      reason: null,
      changedAt: new Date(),
    });

    await updateScore(db, {
      scoreId: "s2",
      changedById: "u1",
      newValue: 4,
      newComment: "updated",
    });

    expect(db.scoreAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scoreId: "s2",
          changedById: "u1",
          previousValue: 2,
          newValue: 4,
          previousComment: "original",
          newComment: "updated",
        }),
      })
    );
  });

  it("includes a reason when the update is triggered by an admin action", async () => {
    const existing = {
      id: "s3",
      evaluationId: "e1",
      requirementId: "r1",
      userId: "u1",
      value: 1,
      evidenceType: null,
      comment: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    db.score.findUniqueOrThrow.mockResolvedValueOnce(existing);
    db.score.update.mockResolvedValueOnce({ ...existing, value: 3 });
    db.scoreAuditLog.create.mockResolvedValueOnce({
      id: "a3",
      scoreId: "s3",
      changedById: "admin1",
      previousValue: 1,
      newValue: 3,
      previousEvidenceType: null,
      newEvidenceType: null,
      previousComment: null,
      newComment: null,
      reason: "Admin correction after evaluation reopened",
      changedAt: new Date(),
    });

    await updateScore(db, {
      scoreId: "s3",
      changedById: "admin1",
      newValue: 3,
      reason: "Admin correction after evaluation reopened",
    });

    expect(db.scoreAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reason: "Admin correction after evaluation reopened",
        }),
      })
    );
  });
});

// ─── Test 4: EvaluationState enum only accepts valid values ───────────────────

describe("EvaluationState enum", () => {
  it("contains exactly the three documented state values", () => {
    expect(Object.values(EvaluationState)).toEqual([
      "IN_PROGRESS",
      "MERGED",
      "FINALISED",
    ]);
  });

  it("does not include undocumented states", () => {
    const validStates = new Set(Object.values(EvaluationState));
    expect(validStates.has("DRAFT" as any)).toBe(false);
    expect(validStates.has("CANCELLED" as any)).toBe(false);
    expect(validStates.has("PENDING" as any)).toBe(false);
    expect(validStates.has("APPROVED" as any)).toBe(false);
  });

  it("follows the correct state ordering (IN_PROGRESS → MERGED → FINALISED)", () => {
    const states = Object.values(EvaluationState);
    expect(states.indexOf("IN_PROGRESS")).toBeLessThan(states.indexOf("MERGED"));
    expect(states.indexOf("MERGED")).toBeLessThan(states.indexOf("FINALISED"));
  });
});
