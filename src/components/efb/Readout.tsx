import { formatNumber } from "@/lib/units";

interface Props {
  label: string;
  value: number;
  unit: string;
  digits?: number;
  size?: "lg" | "md";
  tone?: "green" | "amber";
  signed?: boolean;
  hint?: string;
}

export function Readout({ label, value, unit, digits = 0, size = "lg", tone = "green", signed, hint }: Props) {
  const text = (signed && value > 0 ? "+" : "") + formatNumber(value, digits);
  return (
    <div className="panel flex flex-col gap-1 px-4 py-3">
      <span className="label-caps">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span
          className={
            "readout " +
            (tone === "amber" ? "readout-amber " : "") +
            (size === "lg" ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl")
          }
        >
          {text}
        </span>
        <span className="font-mono text-sm text-muted-foreground">{unit}</span>
      </div>
      {hint && <span className="text-[0.7rem] text-muted-foreground">{hint}</span>}
    </div>
  );
}
