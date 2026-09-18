/**
 * 이착륙 성능 근사 계산 (순수 함수, UI 비의존)
 *
 * ⚠️ 근사식: 영국 CAA Safety Sense Leaflet 7 계열의 rule of thumb 를 그대로 구현한 것으로,
 * 실제 POH(비행 교범) 성능표를 대체하지 않는다. 시뮬레이터·학습용.
 *
 * 내부 단위는 모두 canonical 단위로 고정한다: 길이 ft, 기압 hPa, 속도 kt, 온도 °C, 중량 lb.
 */

export type Surface = "paved" | "dryGrass" | "wetGrass";

export interface Aircraft {
  id: string;
  name: string;
  /** 기준(최대) 중량 lb */
  refWeightLb: number;
  /** 해수면·ISA·최대중량 기준거리 (ft) */
  takeoffGroundRollFt: number;
  takeoff50ftFt: number;
  landingGroundRollFt: number;
  landing50ftFt: number;
  /** 이륙(부양) 속도 kt */
  takeoffSpeedKt: number;
  /** POH 대조가 필요한 근사값인지 */
  approximate?: boolean;
  /** 사용자가 추가한 기체 */
  custom?: boolean;
}

export interface PerformanceInput {
  elevationFt: number;
  qnhHpa: number;
  oatC: number;
  runwayHeadingDeg: number;
  windDirDeg: number;
  windSpeedKt: number;
  runwayLengthFt: number;
  surface: Surface;
  /** 활주로 경사 %. 양수 = 오르막(이륙 방향 기준) */
  slopePct: number;
  aircraft: Aircraft;
  actualWeightLb: number;
}

export interface Atmosphere {
  pressureAltitudeFt: number;
  isaTempC: number;
  isaDeviationC: number;
  densityAltitudeFt: number;
}

export interface WindComponents {
  /** 양수 = 정풍, 음수 = 배풍 */
  headwindKt: number;
  /** 절대값. 부호는 crosswindSide 참고 */
  crosswindKt: number;
  crosswindSide: "left" | "right" | "none";
  isTailwind: boolean;
}

export interface DistanceResult {
  groundRollFt: number;
  over50ftFt: number;
  /** 적용된 보정계수 (설명용) */
  factors: Record<string, number>;
  totalFactor: number;
}

export type GoStatus = "GO" | "MARGINAL" | "NO-GO";

export interface Assessment {
  status: GoStatus;
  /** (가용 − 필요) / 가용. 음수면 부족 */
  marginRatio: number;
  marginFt: number;
}

export interface PerformanceResult {
  atmosphere: Atmosphere;
  wind: WindComponents;
  takeoff: DistanceResult;
  landing: DistanceResult;
  takeoffAssessment: Assessment;
  landingAssessment: Assessment;
}

export const STANDARD_QNH_HPA = 1013.25;
export const MARGINAL_THRESHOLD = 0.15;

// ---------- 1~3. 대기 ----------

/** 기압고도 PA = 표고 + (1013.25 − QNH) × 27  (근사식) */
export function pressureAltitude(elevationFt: number, qnhHpa: number): number {
  return elevationFt + (STANDARD_QNH_HPA - qnhHpa) * 27;
}

/** ISA 온도 = 15 − 1.98 × (PA/1000)  (근사식) */
export function isaTemperature(pressureAltitudeFt: number): number {
  return 15 - 1.98 * (pressureAltitudeFt / 1000);
}

/** 밀도고도 DA = PA + 118.8 × (OAT − ISA온도)  (근사식) */
export function densityAltitude(pressureAltitudeFt: number, oatC: number): number {
  return pressureAltitudeFt + 118.8 * (oatC - isaTemperature(pressureAltitudeFt));
}

export function computeAtmosphere(elevationFt: number, qnhHpa: number, oatC: number): Atmosphere {
  const pa = pressureAltitude(elevationFt, qnhHpa);
  const isa = isaTemperature(pa);
  return {
    pressureAltitudeFt: pa,
    isaTempC: isa,
    isaDeviationC: oatC - isa,
    densityAltitudeFt: densityAltitude(pa, oatC),
  };
}

// ---------- 4. 바람 ----------

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function windComponents(
  windDirDeg: number,
  windSpeedKt: number,
  runwayHeadingDeg: number,
): WindComponents {
  const angle = toRad(windDirDeg - runwayHeadingDeg);
  const head = windSpeedKt * Math.cos(angle);
  const cross = windSpeedKt * Math.sin(angle);
  const eps = 1e-9;
  return {
    headwindKt: head,
    crosswindKt: Math.abs(cross),
    crosswindSide: Math.abs(cross) < eps ? "none" : cross > 0 ? "right" : "left",
    isTailwind: head < -eps,
  };
}

// ---------- 5. 이륙거리 ----------

/** DA에 따른 이륙 보정 (1000ft당 ×1.10, 복리). 음의 DA는 보정 없음 */
export function takeoffDaFactor(densityAltitudeFt: number): number {
  return Math.pow(1.1, Math.max(0, densityAltitudeFt) / 1000);
}

/** DA에 따른 착륙 보정 (1000ft당 ×1.05, 복리) */
export function landingDaFactor(densityAltitudeFt: number): number {
  return Math.pow(1.05, Math.max(0, densityAltitudeFt) / 1000);
}

export function weightFactor(actualWeightLb: number, refWeightLb: number): number {
  if (refWeightLb <= 0) return 1;
  return Math.pow(actualWeightLb / refWeightLb, 2);
}

const TAKEOFF_SURFACE: Record<Surface, number> = { paved: 1, dryGrass: 1.2, wetGrass: 1.3 };
const LANDING_SURFACE: Record<Surface, number> = { paved: 1, dryGrass: 1.15, wetGrass: 1.35 };

/**
 * 바람 보정 (이륙).
 * 정풍: 이륙속도의 10%당 ×0.90 — 단, 정풍은 실제 값의 절반만 반영(보수적).
 * 배풍: 이륙속도의 10%당 ×1.20
 */
export function takeoffWindFactor(headwindKt: number, takeoffSpeedKt: number): number {
  if (takeoffSpeedKt <= 0) return 1;
  const tenPct = takeoffSpeedKt * 0.1;
  if (headwindKt >= 0) {
    const credited = headwindKt / 2; // 최대 절반만 반영
    return Math.pow(0.9, credited / tenPct);
  }
  return Math.pow(1.2, -headwindKt / tenPct);
}

/** 배풍 보정 (착륙). 정풍은 credit 없음(보수적) */
export function landingWindFactor(headwindKt: number, takeoffSpeedKt: number): number {
  if (takeoffSpeedKt <= 0 || headwindKt >= 0) return 1;
  return Math.pow(1.2, -headwindKt / (takeoffSpeedKt * 0.1));
}

/** 오르막 2%당 ×1.10 (이륙). 내리막은 credit 없음 */
export function takeoffSlopeFactor(slopePct: number): number {
  return slopePct > 0 ? Math.pow(1.1, slopePct / 2) : 1;
}

/** 내리막 2%당 ×1.10 (착륙). 오르막은 credit 없음 */
export function landingSlopeFactor(slopePct: number): number {
  return slopePct < 0 ? Math.pow(1.1, -slopePct / 2) : 1;
}

export const TAKEOFF_SAFETY_FACTOR = 1.33;
export const LANDING_SAFETY_FACTOR = 1.43;

export interface DistanceParams {
  densityAltitudeFt: number;
  headwindKt: number;
  surface: Surface;
  slopePct: number;
  actualWeightLb: number;
  aircraft: Aircraft;
}

export function takeoffDistance(p: DistanceParams): DistanceResult {
  const factors = {
    densityAltitude: takeoffDaFactor(p.densityAltitudeFt),
    weight: weightFactor(p.actualWeightLb, p.aircraft.refWeightLb),
    surface: TAKEOFF_SURFACE[p.surface],
    slope: takeoffSlopeFactor(p.slopePct),
    wind: takeoffWindFactor(p.headwindKt, p.aircraft.takeoffSpeedKt),
    safety: TAKEOFF_SAFETY_FACTOR,
  };
  const total = Object.values(factors).reduce((a, b) => a * b, 1);
  return {
    groundRollFt: p.aircraft.takeoffGroundRollFt * total,
    over50ftFt: p.aircraft.takeoff50ftFt * total,
    factors,
    totalFactor: total,
  };
}

export function landingDistance(p: DistanceParams): DistanceResult {
  const factors = {
    densityAltitude: landingDaFactor(p.densityAltitudeFt),
    weight: weightFactor(p.actualWeightLb, p.aircraft.refWeightLb),
    surface: LANDING_SURFACE[p.surface],
    slope: landingSlopeFactor(p.slopePct),
    wind: landingWindFactor(p.headwindKt, p.aircraft.takeoffSpeedKt),
    safety: LANDING_SAFETY_FACTOR,
  };
  const total = Object.values(factors).reduce((a, b) => a * b, 1);
  return {
    groundRollFt: p.aircraft.landingGroundRollFt * total,
    over50ftFt: p.aircraft.landing50ftFt * total,
    factors,
    totalFactor: total,
  };
}

// ---------- 판정 ----------

export function assess(requiredFt: number, availableFt: number): Assessment {
  if (availableFt <= 0) return { status: "NO-GO", marginRatio: -1, marginFt: -requiredFt };
  const marginFt = availableFt - requiredFt;
  const marginRatio = marginFt / availableFt;
  let status: GoStatus = "GO";
  if (marginRatio < 0) status = "NO-GO";
  else if (marginRatio < MARGINAL_THRESHOLD) status = "MARGINAL";
  return { status, marginRatio, marginFt };
}

// ---------- 전체 ----------

export function computePerformance(input: PerformanceInput): PerformanceResult {
  const atmosphere = computeAtmosphere(input.elevationFt, input.qnhHpa, input.oatC);
  const wind = windComponents(input.windDirDeg, input.windSpeedKt, input.runwayHeadingDeg);
  const params: DistanceParams = {
    densityAltitudeFt: atmosphere.densityAltitudeFt,
    headwindKt: wind.headwindKt,
    surface: input.surface,
    slopePct: input.slopePct,
    actualWeightLb: input.actualWeightLb,
    aircraft: input.aircraft,
  };
  const takeoff = takeoffDistance(params);
  const landing = landingDistance(params);
  return {
    atmosphere,
    wind,
    takeoff,
    landing,
    takeoffAssessment: assess(takeoff.over50ftFt, input.runwayLengthFt),
    landingAssessment: assess(landing.over50ftFt, input.runwayLengthFt),
  };
}

/** DA 슬라이더/곡선용: DA 값 배열에 대한 필요거리(50ft) 시리즈 */
export function distanceCurve(
  base: Omit<DistanceParams, "densityAltitudeFt">,
  daValues: number[],
): { da: number; takeoff50: number; landing50: number }[] {
  return daValues.map((da) => ({
    da,
    takeoff50: takeoffDistance({ ...base, densityAltitudeFt: da }).over50ftFt,
    landing50: landingDistance({ ...base, densityAltitudeFt: da }).over50ftFt,
  }));
}
