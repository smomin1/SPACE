import { prisma } from "@/lib/prisma";
import type {
  VitalPillar,
  VitalCoverage,
  VitalRisk,
  VitalVerdict,
  VitalToolDependency,
} from "@prisma/client";

/**
 * Snapshot of a Platform's VITAL standing, derived from the VitalTool linked to
 * it via `VitalTool.platformId`. Powers the (opt-in) VITAL filters in the main
 * results dashboard. Returns null when no tool is linked, so callers can treat
 * the feature as inert until linkage data exists.
 */
export interface PlatformVitalProfile {
  toolId: string;
  toolName: string;
  verdict: VitalVerdict | null;
  vitalScore10: number | null;
  v2Score50: number | null;
  deFactoRisk: VitalRisk | null;
  overallDependency: VitalToolDependency | null;
  cefrRangeLabel: string | null;
  pillarCoverage: Record<VitalPillar, VitalCoverage | null>;
}

const EMPTY_PILLARS: Record<VitalPillar, VitalCoverage | null> = {
  V: null,
  I: null,
  T: null,
  A: null,
  L: null,
};

/** Map a tool's per-pillar Y/P/N rating onto the FULL/PARTIAL/NONE coverage scale. */
function ratingToCoverage(rating: "Y" | "P" | "N"): VitalCoverage {
  if (rating === "Y") return "FULL";
  if (rating === "P") return "PARTIAL";
  return "NONE";
}

export async function getPlatformVitalProfile(
  platformId: string,
): Promise<PlatformVitalProfile | null> {
  const tool = await prisma.vitalTool.findFirst({
    where: { platformId },
    include: { pillarRatings: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!tool) return null;

  const pillarCoverage = { ...EMPTY_PILLARS };
  for (const r of tool.pillarRatings) {
    pillarCoverage[r.pillar] = ratingToCoverage(r.rating);
  }

  return {
    toolId: tool.id,
    toolName: tool.name,
    verdict: tool.verdict,
    vitalScore10: tool.vitalScore10,
    v2Score50: tool.v2Score50,
    deFactoRisk: tool.deFactoRisk,
    overallDependency: tool.overallDependency,
    cefrRangeLabel: tool.cefrRangeLabel,
    pillarCoverage,
  };
}

/**
 * Bulk variant for the results dashboard: returns a map of platformId →
 * profile for every platform that has a linked VitalTool. Platforms with no
 * linked tool are simply absent from the map, so the filter UI can stay hidden
 * when the map is empty.
 */
export async function getLinkedVitalProfiles(
  platformIds?: string[],
): Promise<Map<string, PlatformVitalProfile>> {
  const tools = await prisma.vitalTool.findMany({
    where: {
      platformId: platformIds ? { in: platformIds } : { not: null },
    },
    include: { pillarRatings: true },
    orderBy: { updatedAt: "desc" },
  });

  const map = new Map<string, PlatformVitalProfile>();
  for (const tool of tools) {
    if (!tool.platformId || map.has(tool.platformId)) continue;
    const pillarCoverage = { ...EMPTY_PILLARS };
    for (const r of tool.pillarRatings) {
      pillarCoverage[r.pillar] = ratingToCoverage(r.rating);
    }
    map.set(tool.platformId, {
      toolId: tool.id,
      toolName: tool.name,
      verdict: tool.verdict,
      vitalScore10: tool.vitalScore10,
      v2Score50: tool.v2Score50,
      deFactoRisk: tool.deFactoRisk,
      overallDependency: tool.overallDependency,
      cefrRangeLabel: tool.cefrRangeLabel,
      pillarCoverage,
    });
  }
  return map;
}

/** Optional VITAL filters parsed from the results-dashboard search params. */
export interface VitalFilter {
  verdict?: VitalVerdict | null;
  minVital10?: number | null;
  maxRisk?: VitalRisk | null;
}

const RISK_RANK: Record<VitalRisk, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

/** Parse the opt-in VITAL filter params; returns null when none are set. */
export function parseVitalFilter(params: URLSearchParams): VitalFilter | null {
  const verdict = params.get("vitalVerdict") as VitalVerdict | null;
  const minRaw = params.get("minVital10");
  const maxRisk = params.get("maxRisk") as VitalRisk | null;
  const minVital10 = minRaw ? Number(minRaw) : null;
  if (!verdict && !minVital10 && !maxRisk) return null;
  return { verdict, minVital10: Number.isFinite(minVital10) ? minVital10 : null, maxRisk };
}

/**
 * Server-component variant of {@link parseVitalFilter}: reads the same opt-in
 * params straight from an awaited `searchParams` record. Returns null when no
 * VITAL filter is active, so the results pages stay inert without linkage data.
 */
export function parseVitalFilterFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): VitalFilter | null {
  const str = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : null);
  const verdict = str("vitalVerdict") as VitalVerdict | null;
  const minRaw = str("minVital10");
  const maxRisk = str("maxRisk") as VitalRisk | null;
  const minVital10 = minRaw ? Number(minRaw) : null;
  if (!verdict && !minVital10 && !maxRisk) return null;
  return { verdict, minVital10: Number.isFinite(minVital10) ? minVital10 : null, maxRisk };
}

/** True when a platform's VITAL profile satisfies the given filter. */
export function matchesVitalFilter(
  profile: PlatformVitalProfile | undefined,
  filter: VitalFilter,
): boolean {
  if (!profile) return false;
  if (filter.verdict && profile.verdict !== filter.verdict) return false;
  if (
    filter.minVital10 != null &&
    (profile.vitalScore10 == null || profile.vitalScore10 < filter.minVital10)
  ) {
    return false;
  }
  if (filter.maxRisk) {
    if (profile.deFactoRisk == null) return false;
    if (RISK_RANK[profile.deFactoRisk] > RISK_RANK[filter.maxRisk]) return false;
  }
  return true;
}

/**
 * Narrow a list of platform IDs to those whose linked VITAL tool satisfies the
 * filter. When no VITAL filter is active, the input list is returned unchanged
 * (the feature is inert until both linkage data and a filter exist).
 */
export async function filterPlatformIdsByVital(
  platformIds: string[],
  filter: VitalFilter | null,
): Promise<string[]> {
  if (!filter) return platformIds;
  const profiles = await getLinkedVitalProfiles(platformIds);
  return platformIds.filter((id) => matchesVitalFilter(profiles.get(id), filter));
}
