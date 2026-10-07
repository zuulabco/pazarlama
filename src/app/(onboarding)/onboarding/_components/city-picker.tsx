"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { popularCities } from "@/modules/profile/options";
import { ChipGroup } from "./choice-controls";

const MAX = 12;
const popular = popularCities.map((c) => ({ value: c, label: c }));

function titleCase(s: string) {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr") + w.slice(1).toLocaleLowerCase("tr"))
    .join(" ");
}

export function CityPicker({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const custom = value.filter((v) => !popular.some((p) => p.value === v));
  const options = [...popular, ...custom.map((c) => ({ value: c, label: c }))];

  function add() {
    const city = titleCase(draft);
    if (city.length < 2 || value.length >= MAX) return;
    if (!value.some((v) => v.toLocaleLowerCase("tr") === city.toLocaleLowerCase("tr"))) onChange([...value, city]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault(); // formu göndermesin, şehri eklesin
      add();
    }
  }

  return (
    <div className="grid gap-5">
      <ChipGroup legend="Şehirleri seçin" options={options} value={value} onChange={onChange} error={error} />
      <div className="flex items-end gap-2">
        <div className="grid flex-1 gap-1.5">
          <label htmlFor={id} className="text-sm text-muted">
            Listede yoksa yazıp ekleyin
          </label>
          <input
            id={id}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={40}
            autoComplete="off"
            className="h-12 rounded-control bg-surface px-4 ring-1 ring-line-strong ring-inset outline-none focus:ring-2 focus:ring-forest"
          />
        </div>
        <Button variant="secondary" size="lg" onClick={add} disabled={draft.trim().length < 2 || value.length >= MAX}>
          Ekle
        </Button>
      </div>
    </div>
  );
}
