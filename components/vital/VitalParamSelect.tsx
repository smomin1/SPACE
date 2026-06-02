"use client";

import { useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// URL-param-driven single select. Writes ?<param>=<value> and navigates.
export function VitalParamSelect({
  param,
  placeholder,
  options,
  className,
}: {
  param: string;
  placeholder: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const value = params.get(param) ?? "";

  const onChange = useCallback(
    (v: string) => {
      const next = new URLSearchParams(params.toString());
      if (!v) next.delete(param);
      else next.set(param, v);
      const qs = next.toString();
      router.replace(pathname + (qs ? `?${qs}` : ""), { scroll: false });
    },
    [param, params, pathname, router]
  );

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        className={className ?? "h-9 min-w-[180px] text-[13px]"}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
