"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/vital/recommendations", label: "Recommendation Engine" },
  { href: "/vital/level-stack", label: "Level Stack" },
  { href: "/vital/grid", label: "Full Grid" },
  { href: "/vital/cefr-map", label: "CEFR Mapping" },
  { href: "/vital/landscape", label: "Tool Landscape" },
  { href: "/vital/assessment", label: "Assessment" },
  { href: "/vital/tools", label: "Tools" },
];

export function VitalNav() {
  const pathname = usePathname();

  return (
    <nav className="-mb-px flex gap-0 overflow-x-auto" aria-label="VITAL views">
      {TABS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex shrink-0 items-center border-b-2 px-4 py-3 text-[13px] font-medium transition-colors whitespace-nowrap",
              active
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-700"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
