import { useEffect, useState } from "react";
import { formatNumber } from "@/lib/units";

interface Props {
  id: string;
  label: string;
  /** canonical 값 */
  value: number;
  onChange: (canonical: number) => void;
  unit: string;
  toDisplay?: (v: number) => number;
  fromDisplay?: (v: number) => number;
  digits?: number;
  step?: number;
  min?: number;
  max?: number;
}

const id = (v: number) => v;

/** 단위 변환을 감싼 숫자 입력. 내부 상태는 canonical, 표시는 선택 단위. */
export function NumField({
  id: fieldId,
  label,
  value,
  onChange,
  unit,
  toDisplay = id,
  fromDisplay = id,
  digits = 0,
  step,
  min,
  max,
}: Props) {
  const displayValue = toDisplay(value);
  const [text, setText] = useState(() => formatNumber(displayValue, digits).replace(/,/g, ""));

  useEffect(() => {
    const parsed = parseFloat(text);
    const current = Number.isFinite(parsed) ? fromDisplay(parsed) : NaN;
    if (!Number.isFinite(current) || Math.abs(current - value) > 1e-6) {
      setText(formatNumber(displayValue, digits).replace(/,/g, ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, unit]);

  return (
    <label htmlFor={fieldId} className="flex flex-col gap-1">
      <span className="label-caps">{label}</span>
      <div className="flex items-center overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
        <input
          id={fieldId}
          type="number"
          inputMode="decimal"
          step={step ?? (digits > 0 ? Math.pow(10, -digits) : 1)}
          min={min}
          max={max}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(fromDisplay(n));
          }}
          className="readout w-full min-w-0 bg-transparent px-3 py-2 text-xl outline-none"
        />
        <span className="shrink-0 px-2 font-mono text-xs text-muted-foreground">{unit}</span>
      </div>
    </label>
  );
}
