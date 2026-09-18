import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PerformanceResult } from "@/lib/performance";
import { display, formatNumber, type LengthUnit } from "@/lib/units";

interface Props {
  result: PerformanceResult;
  runwayLengthFt: number;
  lengthUnit: LengthUnit;
}

const statusColor = (s: string) =>
  s === "GO" ? "var(--color-go)" : s === "MARGINAL" ? "var(--color-caution)" : "var(--color-nogo)";

export function DistanceChart({ result, runwayLengthFt, lengthUnit }: Props) {
  const u = (ft: number) => Math.round(display.length(ft, lengthUnit));
  const data = [
    { name: "이륙 지상활주", value: u(result.takeoff.groundRollFt), color: statusColor(result.takeoffAssessment.status) },
    { name: "이륙 50ft 통과", value: u(result.takeoff.over50ftFt), color: statusColor(result.takeoffAssessment.status) },
    { name: "착륙 지상활주", value: u(result.landing.groundRollFt), color: statusColor(result.landingAssessment.status) },
    { name: "착륙 50ft 통과", value: u(result.landing.over50ftFt), color: statusColor(result.landingAssessment.status) },
  ];
  const rwy = u(runwayLengthFt);
  const max = Math.max(rwy, ...data.map((d) => d.value)) * 1.1;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--color-border)" />
          <XAxis
            type="number"
            domain={[0, Math.ceil(max)]}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            stroke="var(--color-border)"
            unit={` ${lengthUnit}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={96}
            tick={{ fill: "var(--color-foreground)", fontSize: 12 }}
            stroke="var(--color-border)"
          />
          <Tooltip
            cursor={{ fill: "var(--color-accent)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontFamily: "var(--font-mono)",
            }}
            formatter={(v: number) => [`${formatNumber(v)} ${lengthUnit}`, "필요거리"]}
          />
          <ReferenceLine
            x={rwy}
            stroke="var(--color-primary)"
            strokeDasharray="6 4"
            strokeWidth={2}
            label={{
              value: `가용 ${formatNumber(rwy)} ${lengthUnit}`,
              position: "insideTopRight",
              fill: "var(--color-primary)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
