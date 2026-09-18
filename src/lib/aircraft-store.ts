import { useCallback, useEffect, useState } from "react";
import builtin from "@/data/aircraft.json";
import type { Aircraft } from "./performance";

const STORAGE_KEY = "efb.customAircraft";

export const BUILTIN_AIRCRAFT: Aircraft[] = (builtin as Aircraft[]).map((a) => ({ ...a, custom: false }));

export function loadCustomAircraft(): Aircraft[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Aircraft[];
    return Array.isArray(parsed) ? parsed.map((a) => ({ ...a, custom: true })) : [];
  } catch {
    return [];
  }
}

export function saveCustomAircraft(list: Aircraft[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** 내장 + 사용자 추가 항공기 목록 (localStorage 동기화) */
export function useAircraftList() {
  const [custom, setCustom] = useState<Aircraft[]>([]);

  useEffect(() => {
    setCustom(loadCustomAircraft());
  }, []);

  const add = useCallback((a: Omit<Aircraft, "id" | "custom">) => {
    const entry: Aircraft = { ...a, id: `custom-${Date.now()}`, custom: true };
    setCustom((prev) => {
      const next = [...prev, entry];
      saveCustomAircraft(next);
      return next;
    });
    return entry;
  }, []);

  const remove = useCallback((id: string) => {
    setCustom((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveCustomAircraft(next);
      return next;
    });
  }, []);

  return { aircraft: [...BUILTIN_AIRCRAFT, ...custom], custom, add, remove };
}
