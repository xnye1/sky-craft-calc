/** 단위 변환 (순수 함수). 내부 canonical: hPa, ft, kt, °C */

export type PressureUnit = "hPa" | "inHg";
export type LengthUnit = "ft" | "m";
export type SpeedUnit = "kt" | "km/h";
export type TempUnit = "°C" | "°F";

export interface UnitPrefs {
  pressure: PressureUnit;
  length: LengthUnit;
  speed: SpeedUnit;
  temp: TempUnit;
}

export const DEFAULT_UNITS: UnitPrefs = { pressure: "hPa", length: "ft", speed: "kt", temp: "°C" };

export const HPA_PER_INHG = 33.8639;
export const FT_PER_M = 3.28084;
export const KMH_PER_KT = 1.852;

export const hpaToInHg = (hpa: number) => hpa / HPA_PER_INHG;
export const inHgToHpa = (inHg: number) => inHg * HPA_PER_INHG;
export const ftToM = (ft: number) => ft / FT_PER_M;
export const mToFt = (m: number) => m * FT_PER_M;
export const ktToKmh = (kt: number) => kt * KMH_PER_KT;
export const kmhToKt = (kmh: number) => kmh / KMH_PER_KT;
export const cToF = (c: number) => (c * 9) / 5 + 32;
export const fToC = (f: number) => ((f - 32) * 5) / 9;

/** canonical → 표시 단위 */
export const display = {
  pressure: (hpa: number, u: PressureUnit) => (u === "hPa" ? hpa : hpaToInHg(hpa)),
  length: (ft: number, u: LengthUnit) => (u === "ft" ? ft : ftToM(ft)),
  speed: (kt: number, u: SpeedUnit) => (u === "kt" ? kt : ktToKmh(kt)),
  temp: (c: number, u: TempUnit) => (u === "°C" ? c : cToF(c)),
};

/** 표시 단위 → canonical */
export const parse = {
  pressure: (v: number, u: PressureUnit) => (u === "hPa" ? v : inHgToHpa(v)),
  length: (v: number, u: LengthUnit) => (u === "ft" ? v : mToFt(v)),
  speed: (v: number, u: SpeedUnit) => (u === "kt" ? v : kmhToKt(v)),
  temp: (v: number, u: TempUnit) => (u === "°C" ? v : fToC(v)),
};

export function formatNumber(v: number, digits = 0): string {
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
