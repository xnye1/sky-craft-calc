import { describe, expect, it } from "vitest";
import {
  assess,
  computeAtmosphere,
  computePerformance,
  landingDistance,
  pressureAltitude,
  takeoffDistance,
  takeoffWindFactor,
  windComponents,
  type Aircraft,
} from "./performance";
import { hpaToInHg, inHgToHpa, ftToM, mToFt } from "./units";

const C172: Aircraft = {
  id: "c172s",
  name: "Cessna 172S",
  refWeightLb: 2550,
  takeoffGroundRollFt: 960,
  takeoff50ftFt: 1630,
  landingGroundRollFt: 575,
  landing50ftFt: 1335,
  takeoffSpeedKt: 55,
};

const TOL_FT = 5;

describe("검증 시나리오 (허용오차 ±5ft)", () => {
  it("1. 표준일: 표고 0, QNH 1013.25, 15°C → DA = 0", () => {
    const a = computeAtmosphere(0, 1013.25, 15);
    expect(a.pressureAltitudeFt).toBeCloseTo(0, 6);
    expect(a.isaTempC).toBeCloseTo(15, 6);
    expect(Math.abs(a.densityAltitudeFt)).toBeLessThanOrEqual(TOL_FT);
  });

  it("2. 고온·고지대: 표고 5000, QNH 1013.25, 30°C → ISA 5.1°C, DA ≈ 7958ft", () => {
    const a = computeAtmosphere(5000, 1013.25, 30);
    expect(a.isaTempC).toBeCloseTo(5.1, 2);
    expect(Math.abs(a.densityAltitudeFt - 7958)).toBeLessThanOrEqual(TOL_FT);
  });

  it("3. 저기압: 표고 1000, QNH 1003 → PA ≈ 1277ft", () => {
    expect(Math.abs(pressureAltitude(1000, 1003) - 1277)).toBeLessThanOrEqual(TOL_FT);
  });
});

describe("바람 성분", () => {
  it("정면 바람은 전부 정풍", () => {
    const w = windComponents(360, 10, 360);
    expect(w.headwindKt).toBeCloseTo(10);
    expect(w.crosswindKt).toBeCloseTo(0);
    expect(w.isTailwind).toBe(false);
  });
  it("90° 측풍", () => {
    const w = windComponents(90, 10, 360);
    expect(w.headwindKt).toBeCloseTo(0);
    expect(w.crosswindKt).toBeCloseTo(10);
    expect(w.crosswindSide).toBe("right");
  });
  it("배풍 감지", () => {
    const w = windComponents(180, 8, 360);
    expect(w.headwindKt).toBeCloseTo(-8);
    expect(w.isTailwind).toBe(true);
  });
});

describe("보정계수", () => {
  const base = {
    headwindKt: 0,
    surface: "paved" as const,
    slopePct: 0,
    actualWeightLb: 2550,
    aircraft: C172,
  };

  it("표준 조건에서는 안전계수만 적용", () => {
    const t = takeoffDistance({ ...base, densityAltitudeFt: 0 });
    expect(t.totalFactor).toBeCloseTo(1.33);
    expect(t.over50ftFt).toBeCloseTo(1630 * 1.33);
    const l = landingDistance({ ...base, densityAltitudeFt: 0 });
    expect(l.totalFactor).toBeCloseTo(1.43);
  });

  it("DA 1000ft당 ×1.10 (복리)", () => {
    const t = takeoffDistance({ ...base, densityAltitudeFt: 2000 });
    expect(t.factors.densityAltitude).toBeCloseTo(1.21);
  });

  it("중량 (실제/기준)^2", () => {
    const t = takeoffDistance({ ...base, densityAltitudeFt: 0, actualWeightLb: 2550 * 0.9 });
    expect(t.factors.weight).toBeCloseTo(0.81);
  });

  it("젖은 잔디 이륙 ×1.30, 착륙 ×1.35", () => {
    expect(takeoffDistance({ ...base, densityAltitudeFt: 0, surface: "wetGrass" }).factors.surface).toBe(1.3);
    expect(landingDistance({ ...base, densityAltitudeFt: 0, surface: "wetGrass" }).factors.surface).toBe(1.35);
  });

  it("오르막 2% 이륙 ×1.10, 내리막 2% 착륙 ×1.10", () => {
    expect(takeoffDistance({ ...base, densityAltitudeFt: 0, slopePct: 2 }).factors.slope).toBeCloseTo(1.1);
    expect(landingDistance({ ...base, densityAltitudeFt: 0, slopePct: -2 }).factors.slope).toBeCloseTo(1.1);
  });

  it("정풍은 절반만 반영: 이륙속도 10%(5.5kt)의 2배 정풍 → 한 단계(×0.90)", () => {
    expect(takeoffWindFactor(11, 55)).toBeCloseTo(0.9);
  });

  it("배풍 10%당 ×1.20", () => {
    expect(takeoffWindFactor(-5.5, 55)).toBeCloseTo(1.2);
  });
});

describe("GO / MARGINAL / NO-GO", () => {
  it("여유 15% 이상이면 GO", () => expect(assess(800, 1000).status).toBe("GO"));
  it("여유 15% 미만이면 MARGINAL", () => expect(assess(900, 1000).status).toBe("MARGINAL"));
  it("부족하면 NO-GO", () => expect(assess(1100, 1000).status).toBe("NO-GO"));
});

describe("computePerformance 통합", () => {
  it("표준일 C172, 3000ft 포장 활주로 → GO", () => {
    const r = computePerformance({
      elevationFt: 0,
      qnhHpa: 1013.25,
      oatC: 15,
      runwayHeadingDeg: 360,
      windDirDeg: 360,
      windSpeedKt: 0,
      runwayLengthFt: 3000,
      surface: "paved",
      slopePct: 0,
      aircraft: C172,
      actualWeightLb: 2550,
    });
    expect(r.atmosphere.densityAltitudeFt).toBeCloseTo(0);
    expect(r.takeoff.over50ftFt).toBeCloseTo(1630 * 1.33);
    expect(r.takeoffAssessment.status).toBe("GO");
    expect(r.landingAssessment.status).toBe("GO");
  });
});

describe("단위 변환", () => {
  it("hPa ↔ inHg 왕복", () => expect(inHgToHpa(hpaToInHg(1013.25))).toBeCloseTo(1013.25));
  it("29.92 inHg ≈ 1013.2 hPa", () => expect(inHgToHpa(29.92)).toBeCloseTo(1013.2, 0));
  it("ft ↔ m 왕복", () => expect(mToFt(ftToM(1000))).toBeCloseTo(1000));
});
