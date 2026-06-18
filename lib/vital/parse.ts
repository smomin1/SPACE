// Parses the three VITAL workbooks into typed records. One source of truth used
// by both the seed generator and the live xlsx upload feature.

import * as XLSX from "xlsx";
import type {
  VitalCoverage,
  VitalDependency,
  VitalToolDependency,
  VitalRisk,
  VitalVerdict,
  VitalToolRole,
  VitalRating,
  VitalComplianceStatus,
} from "@prisma/client";
import {
  PILLARS,
  SKILLS,
  CANONICAL_LEVELS,
  ASSESSMENT_LEVEL_CODES,
  canonicalSkill,
  normCoverage,
  normDependency,
  normToolDependency,
  normRisk,
  normVerdict,
  normRating,
  normToolRole,
  parseScoreFraction,
  normYesNo,
} from "./constants";
import {
  combinePillarCoverage,
  recommendationStatus,
} from "./compute";

export type WorkbookType = "TOOL_LANDSCAPE" | "LEVEL_STACK" | "RECOMMENDATION";

export interface ParsedPillarRating {
  pillar: (typeof PILLARS)[number];
  rating: VitalRating;
}
export interface ParsedSkillCoverage {
  skill: string;
  coverage: VitalCoverage;
  dependency: VitalDependency | null;
}
export interface ParsedLevelMapping {
  levelCode: string;
  coverage: VitalCoverage;
}
export interface ParsedTool {
  name: string;
  role: VitalToolRole;
  vitalScore10: number | null;
  v2Score50: number | null;
  verdict: VitalVerdict | null;
  deFactoRisk: VitalRisk | null;
  overallDependency: VitalToolDependency | null;
  belowA0: boolean;
  cefrRangeLabel: string | null;
  isAssessmentTool: boolean;
  adaptiveTesting: string | null;
  notes: string | null;
  pillarRatings: ParsedPillarRating[];
  skillCoverage: ParsedSkillCoverage[];
  levelMappings: ParsedLevelMapping[];
}

export interface ParsedRecommendation {
  skill: string;
  levelCode: string;
  coreTool: string | null;
  suppTool: string | null;
  coreDependency: VitalToolDependency | null;
  suppDependency: VitalToolDependency | null;
  coreRisk: VitalRisk | null;
  suppRisk: VitalRisk | null;
  pillarV: VitalCoverage;
  pillarI: VitalCoverage;
  pillarT: VitalCoverage;
  pillarA: VitalCoverage;
  pillarL: VitalCoverage;
  status: VitalComplianceStatus;
  deploymentNote: string | null;
}

export interface ParsedLevel {
  code: string;
  scoreBand: string;
  cefrStatus: string;
}

export interface ParseResult {
  workbookType: WorkbookType;
  tools: ParsedTool[];
  recommendations: ParsedRecommendation[];
  levels: ParsedLevel[];
}

function readWorkbook(input: Buffer | ArrayBuffer | Uint8Array): XLSX.WorkBook {
  return XLSX.read(input, { type: "buffer" });
}

function detectType(wb: XLSX.WorkBook): WorkbookType {
  const names = wb.SheetNames;
  if (names.includes("AllCombos")) return "RECOMMENDATION";
  if (names.includes("AllLevels") || names.includes("LevelData")) return "LEVEL_STACK";
  if (
    names.includes("Skills · Dependency · VITAL") ||
    names.includes("21-Point CEFR Mapping") ||
    names.includes("Assessment Landscape")
  )
    return "TOOL_LANDSCAPE";
  throw new Error(
    `Unrecognised VITAL workbook. Sheets: ${names.join(", ")}`
  );
}

type Matrix = (string | number | null)[][];
function sheetMatrix(wb: XLSX.WorkBook, name: string): Matrix | null {
  const ws = wb.Sheets[name];
  if (!ws) return null;
  return XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
    blankrows: false,
  }) as Matrix;
}

function findHeaderRow(rows: Matrix, firstCell: string): number {
  return rows.findIndex(
    (r) => typeof r[0] === "string" && r[0].trim() === firstCell
  );
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// ─── Tool Landscape (3 sheets merged by tool name) ──────────────────────────────
function parseToolLandscape(wb: XLSX.WorkBook): ParsedTool[] {
  const toolsByName = new Map<string, ParsedTool>();

  // 1) Skills · Dependency · VITAL → skill coverage, teacher dependency, pillars, scores.
  const skillsM = sheetMatrix(wb, "Skills · Dependency · VITAL");
  if (skillsM) {
    const h = findHeaderRow(skillsM, "Tool");
    for (let i = h + 1; i < skillsM.length; i++) {
      const r = skillsM[i];
      const name = str(r[0]);
      if (!name) continue;
      const skillCoverage: ParsedSkillCoverage[] = SKILLS.map((s, idx) => ({
        skill: s.name,
        coverage: normCoverage(r[1 + idx]) ?? "NONE",
        dependency: normDependency(r[8 + idx]),
      }));
      const pillarRatings: ParsedPillarRating[] = PILLARS.map((p, idx) => {
        const rating = normRating(r[14 + idx]);
        return rating ? { pillar: p, rating } : null;
      }).filter((x): x is ParsedPillarRating => x != null);
      toolsByName.set(name, {
        name,
        role: "SUPPLEMENTARY", // overwritten from CEFR mapping if present
        vitalScore10: parseScoreFraction(r[19]),
        v2Score50: parseScoreFraction(r[20]),
        verdict: normVerdict(r[21]),
        deFactoRisk: normRisk(r[22]),
        overallDependency: normToolDependency(r[7]),
        belowA0: false,
        cefrRangeLabel: null,
        isAssessmentTool: false,
        adaptiveTesting: null,
        notes: null,
        pillarRatings,
        skillCoverage,
        levelMappings: [],
      });
    }
  }

  // 2) 21-Point CEFR Mapping → role, belowA0, cefrRange, 22-level mappings.
  const cefrM = sheetMatrix(wb, "21-Point CEFR Mapping");
  if (cefrM) {
    const h = findHeaderRow(cefrM, "Tool");
    const header = cefrM[h];
    // level columns are between "Role" (idx 2) and "CEFR range".
    const rangeIdx = header.findIndex(
      (c) => typeof c === "string" && c.trim() === "CEFR range"
    );
    const levelStart = 3;
    const levelEnd = rangeIdx > 0 ? rangeIdx : levelStart + CANONICAL_LEVELS.length;
    const levelCodes = header
      .slice(levelStart, levelEnd)
      .map((c) => str(c))
      .filter((c): c is string => c != null);
    for (let i = h + 1; i < cefrM.length; i++) {
      const r = cefrM[i];
      const name = str(r[0]);
      if (!name) continue;
      const roleInfo = normToolRole(r[2]);
      const levelMappings: ParsedLevelMapping[] = levelCodes.map((code, idx) => ({
        levelCode: code,
        coverage: normCoverage(r[levelStart + idx]) ?? "NONE",
      }));
      const existing = toolsByName.get(name);
      const patch = {
        role: roleInfo?.role ?? "SUPPLEMENTARY",
        belowA0: normYesNo(r[1]),
        cefrRangeLabel: str(r[rangeIdx]),
        levelMappings,
        notes: roleInfo?.qualifier ? `Role: ${roleInfo.qualifier}` : null,
      };
      if (existing) {
        existing.role = patch.role;
        existing.belowA0 = patch.belowA0;
        existing.cefrRangeLabel = patch.cefrRangeLabel;
        existing.levelMappings = patch.levelMappings;
        existing.notes = existing.notes ?? patch.notes;
      } else {
        toolsByName.set(name, {
          name,
          role: patch.role,
          vitalScore10: null,
          v2Score50: null,
          verdict: null,
          deFactoRisk: null,
          overallDependency: null,
          belowA0: patch.belowA0,
          cefrRangeLabel: patch.cefrRangeLabel,
          isAssessmentTool: false,
          adaptiveTesting: null,
          notes: patch.notes,
          pillarRatings: [],
          skillCoverage: [],
          levelMappings: patch.levelMappings,
        });
      }
    }
  }

  // 3) Assessment Landscape → separate assessment tools (23-level coverage).
  const asmM = sheetMatrix(wb, "Assessment Landscape");
  if (asmM) {
    const h = findHeaderRow(asmM, "Assessment tool");
    const header = asmM[h];
    // skill columns: locate each skill alias in the header.
    const skillCols = SKILLS.map((s) => {
      const idx = header.findIndex(
        (c) => typeof c === "string" && canonicalSkill(c) === s.name
      );
      return { skill: s.name, idx };
    });
    // level columns: the 25 canonical codes, located by header text.
    const levelCols = ASSESSMENT_LEVEL_CODES.map((code) => {
      const idx = header.findIndex(
        (c) => typeof c === "string" && c.trim() === code
      );
      return { code, idx };
    });
    for (let i = h + 1; i < asmM.length; i++) {
      const r = asmM[i];
      const name = str(r[0]);
      if (!name) continue;
      const skillCoverage: ParsedSkillCoverage[] = skillCols.map((sc) => ({
        skill: sc.skill,
        coverage: (sc.idx >= 0 ? normCoverage(r[sc.idx]) : null) ?? "NONE",
        dependency: null,
      }));
      const levelMappings: ParsedLevelMapping[] = levelCols
        .filter((lc) => lc.idx >= 0)
        .map((lc) => ({
          levelCode: lc.code,
          coverage: normCoverage(r[lc.idx]) ?? "NONE",
        }));
      toolsByName.set(name, {
        name,
        role: "ASSESSMENT",
        vitalScore10: null,
        v2Score50: null,
        verdict: null,
        deFactoRisk: null,
        overallDependency: null,
        belowA0: false,
        cefrRangeLabel: null,
        isAssessmentTool: true,
        adaptiveTesting: str(r[1]),
        notes: null,
        pillarRatings: [],
        skillCoverage,
        levelMappings,
      });
    }
  }

  return [...toolsByName.values()];
}

// ─── Recommendation Engine (AllCombos) ────────────────────────────────────────
function parseAllCombos(wb: XLSX.WorkBook): ParsedRecommendation[] {
  const ws = wb.Sheets["AllCombos"];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
  });
  const out: ParsedRecommendation[] = [];
  for (const row of rows) {
    const skill = canonicalSkill(String(row["Skill"] ?? ""));
    const levelCode = str(row["Sub-level"]);
    if (!skill || !levelCode) continue;
    out.push(
      buildRecommendation({
        skill,
        levelCode,
        coreTool: str(row["Core tool"]),
        suppTool: str(row["Supp tool"]),
        coreDep: row["Core dep"],
        suppDep: row["Supp dep"],
        coreRisk: row["Core df risk"],
        suppRisk: row["Supp df risk"],
        coreV: row["Core V"], suppV: row["Supp V"],
        coreI: row["Core I"], suppI: row["Supp I"],
        coreT: row["Core T"], suppT: row["Supp T"],
        coreA: row["Core A"], suppA: row["Supp A"],
        coreL: row["Core L"], suppL: row["Supp L"],
        note: str(row["Deployment note"]),
      })
    );
  }
  return out;
}

// ─── Level Stack Engine (AllLevels) ────────────────────────────────────────────
function parseAllLevels(wb: XLSX.WorkBook): {
  recommendations: ParsedRecommendation[];
  levels: ParsedLevel[];
} {
  const recommendations: ParsedRecommendation[] = [];
  const levelsWs = wb.Sheets["LevelData"];
  const levels: ParsedLevel[] = [];
  if (levelsWs) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(levelsWs, {
      defval: null,
    });
    for (const row of rows) {
      const code = str(row["Level"]);
      if (!code) continue;
      levels.push({
        code,
        scoreBand: String(row["Score band"] ?? "").trim(),
        cefrStatus: String(row["CEFR status"] ?? "").trim(),
      });
    }
  }
  const ws = wb.Sheets["AllLevels"];
  if (ws) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: null,
    });
    for (const row of rows) {
      const key = str(row["Key"]); // "A0|Vocabulary"
      const skill = canonicalSkill(String(row["Skill"] ?? ""));
      const levelCode = key ? key.split("|")[0] : null;
      if (!skill || !levelCode) continue;
      recommendations.push(
        buildRecommendation({
          skill,
          levelCode,
          coreTool: str(row["Core"]),
          suppTool: str(row["Supp"]),
          coreDep: row["Core dep"],
          suppDep: row["Supp dep"],
          coreRisk: row["Core df"],
          suppRisk: row["Supp df"],
          coreV: row["Core V"], suppV: row["Supp V"],
          coreI: row["Core I"], suppI: row["Supp I"],
          coreT: row["Core T"], suppT: row["Supp T"],
          coreA: row["Core A"], suppA: row["Supp A"],
          coreL: row["Core L"], suppL: row["Supp L"],
          note: str(row["Note"]),
        })
      );
    }
  }
  return { recommendations, levels };
}

function buildRecommendation(input: {
  skill: string;
  levelCode: string;
  coreTool: string | null;
  suppTool: string | null;
  coreDep: unknown; suppDep: unknown;
  coreRisk: unknown; suppRisk: unknown;
  coreV: unknown; suppV: unknown;
  coreI: unknown; suppI: unknown;
  coreT: unknown; suppT: unknown;
  coreA: unknown; suppA: unknown;
  coreL: unknown; suppL: unknown;
  note: string | null;
}): ParsedRecommendation {
  const pillarV = combinePillarCoverage(normRating(input.coreV), normRating(input.suppV));
  const pillarI = combinePillarCoverage(normRating(input.coreI), normRating(input.suppI));
  const pillarT = combinePillarCoverage(normRating(input.coreT), normRating(input.suppT));
  const pillarA = combinePillarCoverage(normRating(input.coreA), normRating(input.suppA));
  const pillarL = combinePillarCoverage(normRating(input.coreL), normRating(input.suppL));
  return {
    skill: input.skill,
    levelCode: input.levelCode,
    coreTool: input.coreTool,
    suppTool: input.suppTool,
    coreDependency: normToolDependency(input.coreDep),
    suppDependency: normToolDependency(input.suppDep),
    coreRisk: normRisk(input.coreRisk),
    suppRisk: normRisk(input.suppRisk),
    pillarV, pillarI, pillarT, pillarA, pillarL,
    status: recommendationStatus([pillarV, pillarI, pillarT, pillarA, pillarL]),
    deploymentNote: input.note,
  };
}

export function parseVitalWorkbook(
  input: Buffer | ArrayBuffer | Uint8Array
): ParseResult {
  const wb = readWorkbook(input);
  const workbookType = detectType(wb);
  const result: ParseResult = {
    workbookType,
    tools: [],
    recommendations: [],
    levels: [],
  };
  if (workbookType === "TOOL_LANDSCAPE") {
    result.tools = parseToolLandscape(wb);
  } else if (workbookType === "RECOMMENDATION") {
    result.recommendations = parseAllCombos(wb);
  } else if (workbookType === "LEVEL_STACK") {
    const { recommendations, levels } = parseAllLevels(wb);
    result.recommendations = recommendations;
    result.levels = levels;
  }
  return result;
}
