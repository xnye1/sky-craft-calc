import { useEffect, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Wind, TriangleAlert, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Readout } from "./Readout";
import { NumField } from "./NumField";
import { DistanceChart } from "./DistanceChart";
import { DaCurveChart } from "./DaCurveChart";
import { AircraftForm } from "./AircraftForm";
import { useUnits } from "@/lib/units-context";
import { display, parse, formatNumber } from "@/lib/units";
import { useAircraftList } from "@/lib/aircraft-store";
import {
  computePerformance,
  computeAtmosphere,
  type Aircraft,
  type Assessment,
  type PerformanceInput,
  type Surface,
} from "@/lib/performance";

type Fields = Omit<PerformanceInput, "aircraft">;

const DEFAULTS: Fields = {
  elevationFt: 0,
  qnhHpa: 1013.25,
  oatC: 15,
  runwayHeadingDeg: 360,
  windDirDeg: 360,
  windSpeedKt: 0,
  runwayLengthFt: 3000,
  surface: "paved",
  slopePct: 0,
  actualWeightLb: 2550,
};

interface Preset {
  id: string;
  label: string;
  hint: string;
  fields: Partial<Fields>;
  compareTemps?: [number, number];
}

const PRESETS: Preset[] = [
  { id: "std", label: "1. 표준일", hint: "표고 0 · 1013.25 · 15°C → DA 0", fields: { elevationFt: 0, qnhHpa: 1013.25, oatC: 15 } },
  { id: "hot-high", label: "2. 고온·고지대", hint: "표고 5000 · 30°C → DA ≈ 7958", fields: { elevationFt: 5000, qnhHpa: 1013.25, oatC: 30 } },
  { id: "low-qnh", label: "3. 저기압", hint: "표고 1000 · QNH 1003 → PA ≈ 1277", fields: { elevationFt: 1000, qnhHpa: 1003, oatC: 15 } },
  {
    id: "stol",
    label: "4. STOL 챌린지",
    hint: "800ft 잔디 + 높은 DA — 아래 '항공기 비교'에서 STOL기와 비교",
    fields: { elevationFt: 6000, qnhHpa: 1013.25, oatC: 32, runwayLengthFt: 800, surface: "dryGrass", windSpeedKt: 0 },
  },
  {
    id: "airrace",
    label: "5. 에어레이스",
    hint: "같은 비행장 아침 10°C vs 오후 35°C",
    fields: { elevationFt: 2500, qnhHpa: 1013.25, oatC: 35, runwayLengthFt: 2500, surface: "paved" },
    compareTemps: [10, 35],
  },
];

const SURFACES: { value: Surface; label: string }[] = [
  { value: "paved", label: "포장" },
  { value: "dryGrass", label: "마른 잔디" },
  { value: "wetGrass", label: "젖은 잔디" },
];

export function PerformanceTab() {
  const { units } = useUnits();
  const { aircraft: aircraftList, custom, add, remove } = useAircraftList();
  const [fields, setFields] = useState<Fields>(DEFAULTS);
  const [aircraftId, setAircraftId] = useState(aircraftList[0]?.id ?? "");
  const [compareTemps, setCompareTemps] = useState<[number, number] | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [sliderDa, setSliderDa] = useState(0);
  const [sliderTouched, setSliderTouched] = useState(false);

  const aircraft: Aircraft = aircraftList.find((a) => a.id === aircraftId) ?? aircraftList[0];
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => {
    setFields((f) => ({ ...f, [k]: v }));
    setActivePreset(null);
  };

  const input: PerformanceInput = { ...fields, aircraft };
  const result = useMemo(() => computePerformance(input), [fields, aircraft]); // eslint-disable-line react-hooks/exhaustive-deps

  // 슬라이더는 사용자가 건드리기 전까지 현재 DA를 따라감
  useEffect(() => {
    if (!sliderTouched) setSliderDa(Math.min(10000, Math.max(0, Math.round(result.atmosphere.densityAltitudeFt / 100) * 100)));
  }, [result.atmosphere.densityAltitudeFt, sliderTouched]);

  const applyPreset = (p: Preset) => {
    setFields((f) => ({ ...f, ...p.fields }));
    setCompareTemps(p.compareTemps ?? null);
    setActivePreset(p.id);
    setSliderTouched(false);
  };

  const selectAircraft = (id: string) => {
    setAircraftId(id);
    const a = aircraftList.find((x) => x.id === id);
    if (a) setFields((f) => ({ ...f, actualWeightLb: a.refWeightLb }));
  };

  const L = units.length;
  const lengthProps = {
    unit: L,
    toDisplay: (v: number) => display.length(v, L),
    fromDisplay: (v: number) => parse.length(v, L),
  };
  const fmtLen = (ft: number) => `${formatNumber(display.length(ft, L))} ${L}`;
  const fmtSpd = (kt: number) => `${formatNumber(display.speed(kt, units.speed), 0)} ${units.speed}`;
  const fmtTemp = (c: number) => `${formatNumber(display.temp(c, units.temp), 1)}${units.temp}`;

  const { atmosphere, wind } = result;

  return (
    <div className="flex flex-col gap-4">
      {/* 프리셋 */}
      <section className="panel px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <FlaskConical className="size-4 text-primary" />
          <span className="label-caps">검증 시나리오 프리셋</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={activePreset === p.id ? "default" : "secondary"}
              title={p.hint}
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        {activePreset && (
          <p className="mt-2 text-xs text-muted-foreground">{PRESETS.find((p) => p.id === activePreset)?.hint}</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* 입력 */}
        <section className="panel flex flex-col gap-4 px-4 py-4">
          <h2 className="label-caps">입력</h2>
          <div className="grid grid-cols-2 gap-3">
            <NumField id="elev" label="비행장 표고" value={fields.elevationFt} onChange={(v) => set("elevationFt", v)} {...lengthProps} />
            <NumField
              id="qnh"
              label="QNH"
              value={fields.qnhHpa}
              onChange={(v) => set("qnhHpa", v)}
              unit={units.pressure}
              toDisplay={(v) => display.pressure(v, units.pressure)}
              fromDisplay={(v) => parse.pressure(v, units.pressure)}
              digits={2}
            />
            <NumField
              id="oat"
              label="외기온도 OAT"
              value={fields.oatC}
              onChange={(v) => set("oatC", v)}
              unit={units.temp}
              toDisplay={(v) => display.temp(v, units.temp)}
              fromDisplay={(v) => parse.temp(v, units.temp)}
              digits={1}
            />
            <NumField id="rwy" label="활주로 방향" value={fields.runwayHeadingDeg} onChange={(v) => set("runwayHeadingDeg", v)} unit="°" min={0} max={360} />
            <NumField id="wdir" label="풍향" value={fields.windDirDeg} onChange={(v) => set("windDirDeg", v)} unit="°" min={0} max={360} />
            <NumField
              id="wspd"
              label="풍속"
              value={fields.windSpeedKt}
              onChange={(v) => set("windSpeedKt", v)}
              unit={units.speed}
              toDisplay={(v) => display.speed(v, units.speed)}
              fromDisplay={(v) => parse.speed(v, units.speed)}
              min={0}
            />
            <NumField id="len" label="활주로 길이" value={fields.runwayLengthFt} onChange={(v) => set("runwayLengthFt", v)} {...lengthProps} />
            <NumField id="slope" label="경사 (+오르막)" value={fields.slopePct} onChange={(v) => set("slopePct", v)} unit="%" digits={1} />
          </div>

          <div className="flex flex-col gap-1">
            <span className="label-caps">노면</span>
            <div className="grid grid-cols-3 overflow-hidden rounded-md border border-input">
              {SURFACES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={fields.surface === s.value}
                  onClick={() => set("surface", s.value)}
                  className={
                    "py-2 text-sm transition-colors " +
                    (fields.surface === s.value ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-accent")
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="label-caps">항공기</span>
              <select
                value={aircraft?.id}
                onChange={(e) => selectAircraft(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {aircraftList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.custom ? " (사용자)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <NumField id="wt" label="실제 중량" value={fields.actualWeightLb} onChange={(v) => set("actualWeightLb", v)} unit="lb" min={0} />
          </div>
          {aircraft?.approximate && (
            <p className="flex items-start gap-1.5 text-[0.7rem] text-caution">
              <TriangleAlert className="mt-0.5 size-3 shrink-0" />
              기준거리는 POH 대조가 필요한 근사값입니다. (기준 {aircraft.refWeightLb} lb · Vr≈{aircraft.takeoffSpeedKt} kt)
            </p>
          )}
        </section>

        {/* 결과 */}
        <div className="flex flex-col gap-4">
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Readout label="기압고도 PA" value={atmosphere.pressureAltitudeFt} unit="ft" />
            <Readout label="밀도고도 DA" value={atmosphere.densityAltitudeFt} unit="ft" tone="amber" />
            <Readout label="ISA 편차" value={atmosphere.isaDeviationC} unit="°C" digits={1} signed hint={`ISA ${formatNumber(atmosphere.isaTempC, 1)}°C`} />
            <div className="panel flex flex-col gap-1 px-4 py-3">
              <span className="label-caps">바람 성분</span>
              <div className="flex items-center gap-2">
                {wind.isTailwind ? <ArrowDown className="size-5 text-nogo" /> : <ArrowUp className="size-5 text-go" />}
                <span className={"readout text-2xl sm:text-3xl " + (wind.isTailwind ? "text-nogo" : "")}>
                  {formatNumber(Math.abs(display.speed(wind.headwindKt, units.speed)))}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{units.speed} {wind.isTailwind ? "배풍" : "정풍"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wind className="size-4 text-muted-foreground" />
                <span className="font-mono">측풍 {fmtSpd(wind.crosswindKt)}</span>
                <span className="text-xs text-muted-foreground">
                  {wind.crosswindSide === "right" ? "우측" : wind.crosswindSide === "left" ? "좌측" : ""}
                </span>
              </div>
            </div>
          </section>

          {wind.isTailwind && (
            <div className="flex items-center gap-2 rounded-md border border-nogo/50 bg-nogo/10 px-3 py-2 text-sm text-nogo">
              <TriangleAlert className="size-4" />
              배풍 {fmtSpd(-wind.headwindKt)} — 반대 방향 활주로 사용을 고려하세요. 이륙·착륙 거리가 크게 늘어납니다.
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2">
            <StatusCard title="이륙" assessment={result.takeoffAssessment} groundRoll={fmtLen(result.takeoff.groundRollFt)} over50={fmtLen(result.takeoff.over50ftFt)} factor={result.takeoff.totalFactor} />
            <StatusCard title="착륙" assessment={result.landingAssessment} groundRoll={fmtLen(result.landing.groundRollFt)} over50={fmtLen(result.landing.over50ftFt)} factor={result.landing.totalFactor} />
          </section>

          <section className="panel px-4 py-4">
            <h2 className="label-caps mb-2">필요거리 vs 가용 활주로 ({fmtLen(fields.runwayLengthFt)})</h2>
            <ClientOnly fallback={<div className="h-64" />}>
              <DistanceChart result={result} runwayLengthFt={fields.runwayLengthFt} lengthUnit={L} />
            </ClientOnly>
          </section>

          <section className="panel px-4 py-4">
            <h2 className="label-caps mb-3">밀도고도에 따른 필요거리 (0–10,000 ft)</h2>
            <ClientOnly fallback={<div className="h-80" />}>
              <DaCurveChart
                base={{ headwindKt: wind.headwindKt, surface: fields.surface, slopePct: fields.slopePct, actualWeightLb: fields.actualWeightLb, aircraft }}
                runwayLengthFt={fields.runwayLengthFt}
                currentDaFt={atmosphere.densityAltitudeFt}
                sliderDa={sliderDa}
                onSliderDa={(v) => {
                  setSliderTouched(true);
                  setSliderDa(v);
                }}
                lengthUnit={L}
              />
            </ClientOnly>
          </section>

          {compareTemps && (
            <section className="panel px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="label-caps">온도 비교 — 같은 비행장</h2>
                <Button size="sm" variant="ghost" onClick={() => setCompareTemps(null)}>닫기</Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {compareTemps.map((t) => {
                  const r = computePerformance({ ...input, oatC: t });
                  return (
                    <div key={t} className="rounded-md border border-panel-border bg-background/60 p-3">
                      <div className="readout-amber readout text-2xl">{fmtTemp(t)}</div>
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-sm">
                        <dt className="text-muted-foreground">DA</dt><dd>{formatNumber(r.atmosphere.densityAltitudeFt)} ft</dd>
                        <dt className="text-muted-foreground">이륙 50ft</dt><dd className={r.takeoffAssessment.status === "NO-GO" ? "text-nogo" : ""}>{fmtLen(r.takeoff.over50ftFt)}</dd>
                        <dt className="text-muted-foreground">착륙 50ft</dt><dd className={r.landingAssessment.status === "NO-GO" ? "text-nogo" : ""}>{fmtLen(r.landing.over50ftFt)}</dd>
                        <dt className="text-muted-foreground">판정</dt><dd><StatusPill status={r.takeoffAssessment.status} /></dd>
                      </dl>
                    </div>
                  );
                })}
              </div>
              {(() => {
                const a = computeAtmosphere(fields.elevationFt, fields.qnhHpa, compareTemps[0]);
                const b = computeAtmosphere(fields.elevationFt, fields.qnhHpa, compareTemps[1]);
                return (
                  <p className="mt-3 text-xs text-muted-foreground">
                    온도 {fmtTemp(compareTemps[1] - compareTemps[0]).replace(/^-?/, "+")} 상승 → DA +{formatNumber(b.densityAltitudeFt - a.densityAltitudeFt)} ft
                  </p>
                );
              })()}
            </section>
          )}

          <section className="panel px-4 py-4">
            <h2 className="label-caps mb-3">항공기 비교 — 현재 조건 (각 기체 기준중량 기준)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="label-caps text-left">
                  <tr>
                    <th className="pb-2 font-normal">항공기</th>
                    <th className="pb-2 font-normal">이륙 50ft</th>
                    <th className="pb-2 font-normal">착륙 50ft</th>
                    <th className="pb-2 font-normal">이륙</th>
                    <th className="pb-2 font-normal">착륙</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {aircraftList.map((a) => {
                    const r = computePerformance({ ...fields, aircraft: a, actualWeightLb: a.refWeightLb });
                    return (
                      <tr key={a.id} className={"border-t border-border " + (a.id === aircraft.id ? "bg-accent/40" : "")}>
                        <td className="py-1.5 pr-2 font-sans">{a.name}</td>
                        <td className="py-1.5 pr-2">{fmtLen(r.takeoff.over50ftFt)}</td>
                        <td className="py-1.5 pr-2">{fmtLen(r.landing.over50ftFt)}</td>
                        <td className="py-1.5 pr-2"><StatusPill status={r.takeoffAssessment.status} /></td>
                        <td className="py-1.5"><StatusPill status={r.landingAssessment.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {custom.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">아래 폼에서 STOL기를 추가하면 여기서 바로 비교됩니다.</p>
            )}
          </section>

          <section className="panel px-4 py-4">
            <h2 className="label-caps mb-3">항공기 추가</h2>
            <AircraftForm custom={custom} onAdd={(a) => selectAircraft(add(a).id)} onRemove={remove} />
          </section>
        </div>
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<Assessment["status"], string> = {
  GO: "bg-go text-go-foreground shadow-glow-go",
  MARGINAL: "bg-caution text-caution-foreground shadow-glow-caution",
  "NO-GO": "bg-nogo text-nogo-foreground shadow-glow-nogo",
};

function StatusPill({ status }: { status: Assessment["status"] }) {
  return <span className={"rounded px-1.5 py-0.5 font-mono text-[0.65rem] font-bold " + STATUS_STYLE[status]}>{status}</span>;
}

function StatusCard({ title, assessment, groundRoll, over50, factor }: { title: string; assessment: Assessment; groundRoll: string; over50: string; factor: number }) {
  return (
    <div className="panel flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="label-caps">{title} 필요거리</span>
        <span className={"rounded-md px-3 py-1 font-mono text-lg font-bold tracking-wider " + STATUS_STYLE[assessment.status]}>
          {assessment.status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="label-caps">지상활주</div>
          <div className="readout text-2xl sm:text-3xl">{groundRoll}</div>
        </div>
        <div>
          <div className="label-caps">50ft 장애물 통과</div>
          <div className="readout text-2xl sm:text-3xl">{over50}</div>
        </div>
      </div>
      <div className="flex justify-between font-mono text-xs text-muted-foreground">
        <span>여유 {assessment.marginRatio >= 0 ? "+" : ""}{formatNumber(assessment.marginRatio * 100, 0)}%</span>
        <span>총 보정 ×{factor.toFixed(2)}</span>
      </div>
    </div>
  );
}
