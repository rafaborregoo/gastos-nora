"use client";

import { useMemo, useState } from "react";

import { CATEGORY_ICON_OPTIONS, getCategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";

export function IconPicker({
  value,
  onChange
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filteredIcons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return CATEGORY_ICON_OPTIONS;
    }

    return CATEGORY_ICON_OPTIONS.filter(
      (icon) =>
        icon.label.toLowerCase().includes(normalizedQuery) || icon.value.toLowerCase().includes(normalizedQuery)
    );
  }, [query]);

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar icono por nombre"
      />
      <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto rounded-[24px] border border-border bg-background/70 p-3 sm:grid-cols-4">
        {filteredIcons.map((icon) => {
          const Icon = getCategoryIcon(icon.value);
          const isSelected = value === icon.value;

          return (
            <button
              key={icon.value}
              type="button"
              onClick={() => onChange(icon.value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center text-xs transition",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background">
                <Icon className="h-5 w-5" />
              </span>
              <span className="line-clamp-2">{icon.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

