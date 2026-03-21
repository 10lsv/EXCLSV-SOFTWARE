export const SHIFTS = {
  SHIFT_A: { label: "Shift A", start: 12, end: 20, color: "#3B82F6" },
  SHIFT_B: { label: "Shift B", start: 20, end: 4, color: "#8B5CF6" },
  SHIFT_C: { label: "Shift C", start: 4, end: 8, color: "#F59E0B" },
} as const;

export type ShiftType = keyof typeof SHIFTS;

export const SHIFT_LABELS: Record<ShiftType, string> = {
  SHIFT_A: "12h – 20h",
  SHIFT_B: "20h – 4h",
  SHIFT_C: "4h – 8h",
};

export const AGENCY_TIMEZONE = "Europe/Paris";

export function getShiftDuration(shiftType: ShiftType): number {
  const shift = SHIFTS[shiftType];
  if (shift.end > shift.start) return shift.end - shift.start;
  return (24 - shift.start) + shift.end;
}

export const CLOCK_IN_GRACE_PERIOD = 30;
export const AUTO_CLOSE_DELAY = 30;
