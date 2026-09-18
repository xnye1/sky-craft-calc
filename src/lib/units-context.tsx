import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_UNITS, type UnitPrefs } from "./units";

const STORAGE_KEY = "efb.units";

interface UnitsCtx {
  units: UnitPrefs;
  setUnit: <K extends keyof UnitPrefs>(key: K, value: UnitPrefs[K]) => void;
}

const Ctx = createContext<UnitsCtx>({ units: DEFAULT_UNITS, setUnit: () => {} });

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<UnitPrefs>(DEFAULT_UNITS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setUnits({ ...DEFAULT_UNITS, ...(JSON.parse(raw) as Partial<UnitPrefs>) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
  }, [units, loaded]);

  const setUnit: UnitsCtx["setUnit"] = (key, value) => setUnits((u) => ({ ...u, [key]: value }));

  return <Ctx.Provider value={{ units, setUnit }}>{children}</Ctx.Provider>;
}

export const useUnits = () => useContext(Ctx);
