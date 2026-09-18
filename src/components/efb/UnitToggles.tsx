import { useUnits } from "@/lib/units-context";
import type { UnitPrefs } from "@/lib/units";

const OPTIONS: { key: keyof UnitPrefs; values: string[] }[] = [
  { key: "pressure", values: ["hPa", "inHg"] },
  { key: "length", values: ["ft", "m"] },
  { key: "speed", values: ["kt", "km/h"] },
  { key: "temp", values: ["°C", "°F"] },
];

export function UnitToggles() {
  const { units, setUnit } = useUnits();
  return (
    <div className="flex flex-wrap items-center justify-end gap-1" aria-label="단위 설정">
      {OPTIONS.map(({ key, values }) => (
        <div key={key} className="flex overflow-hidden rounded-md border border-panel-border bg-panel">
          {values.map((v) => {
            const active = units[key] === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setUnit(key, v as never)}
                aria-pressed={active}
                className={
                  "px-2 py-1 font-mono text-[0.68rem] transition-colors " +
                  (active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground")
                }
              >
                {v}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
