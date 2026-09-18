import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Slider } from "@/components/ui/slider";
import { distanceCurve, landingDistance, takeoffDistance, type DistanceParams } from "@/lib/performance";
import { display, formatNumber, type LengthUnit } from "@/lib/units";

interface Props {
  base: Omit<DistanceParams, "densityAltitudeFt">;
  runwayLengthFt: number;
  currentDaFt: number;
  sliderDa: number;
  onSliderDa: (da: number) => void;
  lengthUnit: LengthUnit;
}

const DA_VALUES = Array.from({ length: 21 }, (_, i) => i * 500);

export function DaCurveChart({ base, runwayLengthFt, currentDaFt, sliderDa, onSliderDa, lengthUnit }: Props) {
  const u = (ft: number) => Math.round(display.length(ft, lengthUnit));
  const data = useMemo(
    () => distanceCurve(base, DA_VALUES).map((d) => ({ da: d.da, takeoff: u(d.takeoff50), landing: u(d.landing50) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, lengthUnit],
  );
  const atSlider = {
    takeoff: takeoffDistance({ ...base, densityAltitudeFt: sliderDa }).over50ftFt,
    landing: landingDistance({ ...base, densityAltitudeFt: sliderDa }).over50ftFt,
  };
  const rwy = u(runwayLengthFt);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="슬라이더 DA" value={formatNumber(sliderDa)} unit="ft" amber />
        <Stat label="이륙 50ft" value={formatNumber(u(atSlider.takeoff))} unit={lengthUnit} bad={atSlider.takeoff > runwayLengthFt} />
        <Stat label="착륙 50ft" value={formatNumber(u(atSlider.landing))} unit={lengthUnit} bad={atSlider.landing > runwayLengthFt} />
      </div>
      <Slider
        value={[sliderDa]}
        min={0}
        max={10000}
        step={100}
        onValueChange={(v) => onSliderDa(v[0] ?? 0)}
        aria-label="밀도고도 슬라이더"
      />
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="da"
              type="number"
              domain={[0, 10000]}
              ticks={[0, 2000, 4000, 6000, 8000, 10000]}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              stroke="var(--color-border)"
              label={{ value: "DA (ft)", position: "insideBottomRight", fill: "var(--color-muted-foreground)", fontSize: 11, dy: 10 }}
            />
            <YAxis
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              stroke="var(--color-border)"
              width={56}
              unit={lengthUnit === "ft" ? "" : ""}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontFamily: "var(--font-mono)",
              }}
              labelFormatter={(l) => `DA ${formatNumber(Number(l))} ft`}
              formatter={(v: number, name: string) => [`${formatNumber(v)} ${lengthUnit}`, name === "takeoff" ? "이륙 50ft" : "착륙 50ft"]}
            />
            <ReferenceLine y={rwy} stroke="var(--color-primary)" strokeDasharray="6 4" label={{ value: "가용 활주로", fill: "var(--color-primary)", fontSize: 11, position: "insideTopLeft" }} />
            <ReferenceLine x={Math.round(currentDaFt / 100) * 100} stroke="var(--color-readout-dim)" strokeDasharray="2 2" label={{ value: "현재", fill: "var(--color-readout-dim)", fontSize: 10, position: "top" }} />
            <ReferenceLine x={sliderDa} stroke="var(--color-caution)" strokeWidth={2} />
            <Line type="monotone" dataKey="takeoff" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="landing" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><i className="inline-block h-0.5 w-4 bg-chart-2" /> 이륙 50ft 통과</span>
        <span className="flex items-center gap-1"><i className="inline-block h-0.5 w-4 bg-chart-3" /> 착륙 50ft 통과</span>
      </div>
    </div>
  );
}

function Stat({ label, value, unit, amber, bad }: { label: string; value: string; unit: string; amber?: boolean; bad?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-panel-border bg-background/60 px-3 py-2">
      <span className="label-caps">{label}</span>
      <span className={"readout text-xl sm:text-2xl " + (amber ? "readout-amber" : bad ? "text-nogo" : "")}>
        {value} <span className="font-mono text-xs text-muted-foreground">{unit}</span>
      </span>
    </div>
  );
}
