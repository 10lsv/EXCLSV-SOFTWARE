import * as XLSX from "xlsx";

export function parseMoney(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === "" || val === "-") return 0;
  if (typeof val === "number") return val;
  return parseFloat(String(val).replace(/[$,]/g, "")) || 0;
}

export function parseHours(val: string | number | null | undefined): number {
  if (!val || val === "-") return 0;
  if (typeof val === "number") return val;
  const s = String(val);
  const hMatch = s.match(/(\d+)h/);
  const mMatch = s.match(/(\d+)min/);
  const hours = hMatch ? parseInt(hMatch[1]) : 0;
  const mins = mMatch ? parseInt(mMatch[1]) : 0;
  return hours + mins / 60;
}

export function parseChatterDate(val: string | number | null | undefined): Date | null {
  if (!val) return null;
  const s = String(val);
  const firstDate = s.split(" - ")[0].trim();
  const d = new Date(firstDate);
  return isNaN(d.getTime()) ? null : d;
}

export function parseInflowwDate(val: string | number | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

export function parseXlsx(buffer: Buffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: "buffer", cellDates: true });
}

export function getSheet(wb: XLSX.WorkBook, ...names: string[]): XLSX.WorkSheet | null {
  for (const name of names) {
    if (wb.SheetNames.includes(name)) return wb.Sheets[name];
  }
  // Fallback: first sheet
  return wb.Sheets[wb.SheetNames[0]] || null;
}

export function sheetToJson(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}
