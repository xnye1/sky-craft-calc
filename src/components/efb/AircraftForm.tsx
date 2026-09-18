import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Aircraft } from "@/lib/performance";

interface Props {
  custom: Aircraft[];
  onAdd: (a: Omit<Aircraft, "id" | "custom">) => void;
  onRemove: (id: string) => void;
}

const FIELDS: { key: keyof Draft; label: string; unit: string }[] = [
  { key: "refWeightLb", label: "기준(최대) 중량", unit: "lb" },
  { key: "takeoffSpeedKt", label: "이륙 속도", unit: "kt" },
  { key: "takeoffGroundRollFt", label: "이륙 지상활주", unit: "ft" },
  { key: "takeoff50ftFt", label: "이륙 50ft 통과", unit: "ft" },
  { key: "landingGroundRollFt", label: "착륙 지상활주", unit: "ft" },
  { key: "landing50ftFt", label: "착륙 50ft 통과", unit: "ft" },
];

interface Draft {
  name: string;
  refWeightLb: string;
  takeoffSpeedKt: string;
  takeoffGroundRollFt: string;
  takeoff50ftFt: string;
  landingGroundRollFt: string;
  landing50ftFt: string;
}

/** STOL 예시 (Zenith CH 701 근처 값 — 근사) */
const STOL_EXAMPLE: Draft = {
  name: "STOL 예시 (CH701급)",
  refWeightLb: "1100",
  takeoffSpeedKt: "30",
  takeoffGroundRollFt: "120",
  takeoff50ftFt: "300",
  landingGroundRollFt: "120",
  landing50ftFt: "350",
};

const EMPTY: Draft = { name: "", refWeightLb: "", takeoffSpeedKt: "", takeoffGroundRollFt: "", takeoff50ftFt: "", landingGroundRollFt: "", landing50ftFt: "" };

export function AircraftForm({ custom, onAdd, onRemove }: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const nums = Object.fromEntries(FIELDS.map((f) => [f.key, parseFloat(draft[f.key])])) as Record<string, number>;
    if (!draft.name.trim()) return setError("이름을 입력하세요.");
    if (Object.values(nums).some((n) => !Number.isFinite(n) || n <= 0)) return setError("모든 수치는 0보다 큰 숫자여야 합니다.");
    onAdd({
      name: draft.name.trim(),
      refWeightLb: nums.refWeightLb,
      takeoffSpeedKt: nums.takeoffSpeedKt,
      takeoffGroundRollFt: nums.takeoffGroundRollFt,
      takeoff50ftFt: nums.takeoff50ftFt,
      landingGroundRollFt: nums.landingGroundRollFt,
      landing50ftFt: nums.landing50ftFt,
      approximate: true,
    });
    setDraft(EMPTY);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        해수면·ISA·최대중량 기준 POH 값을 입력하세요. 브라우저(localStorage)에 저장됩니다. STOL기는 여기에 추가하세요.
      </p>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="col-span-2 flex flex-col gap-1 sm:col-span-3">
          <span className="label-caps">이름</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="예: Zenith CH 750"
          />
        </label>
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="label-caps">{f.label}</span>
            <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
              <input
                type="number"
                inputMode="decimal"
                value={draft[f.key]}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                className="readout w-full min-w-0 bg-transparent px-3 py-2 text-lg outline-none"
              />
              <span className="px-2 font-mono text-xs text-muted-foreground">{f.unit}</span>
            </div>
          </label>
        ))}
        {error && <p className="col-span-2 text-xs text-nogo sm:col-span-3">{error}</p>}
        <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-3">
          <Button type="submit" size="sm">
            <Plus className="size-4" /> 항공기 추가
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setDraft(STOL_EXAMPLE)}>
            STOL 예시 채우기
          </Button>
        </div>
      </form>

      {custom.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-panel-border">
          {custom.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                {a.name}
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  TO {a.takeoff50ftFt}ft · LDG {a.landing50ftFt}ft · {a.refWeightLb}lb
                </span>
              </span>
              <Button type="button" size="icon" variant="ghost" aria-label="삭제" onClick={() => onRemove(a.id)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
