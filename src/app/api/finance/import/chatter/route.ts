import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";
import { parseXlsx, getSheet, sheetToJson, parseMoney, parseHours, parseChatterDate } from "@/lib/xlsx-parser";

// POST /api/finance/import/chatter — import chatter XLSX from Infloww
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const chatterId = formData.get("chatterId") as string | null;
    const modelId = formData.get("modelId") as string | null;

    if (!file || !chatterId || !modelId) return jsonError("file, chatterId et modelId requis");

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = parseXlsx(buffer);
    const sheet = getSheet(wb, "By time and employee");

    if (!sheet) return jsonError("Feuille 'By time and employee' introuvable");

    const rows = sheetToJson(sheet);
    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const r = row as Record<string, unknown>;
      const date = parseChatterDate(r["Date/Time Europe/Brussels"] as string);
      if (!date) { skipped++; continue; }

      const normalizedDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const salesGross = parseMoney(r["Sales"] as string);

      try {
        await prisma.chatterDailyData.upsert({
          where: {
            chatterId_modelId_date: { chatterId, modelId, date: normalizedDate },
          },
          update: {
            salesGross,
            ppvSalesGross: parseMoney(r["PPV sales"] as string),
            tipsGross: parseMoney(r["Tips"] as string),
            messagesGross: parseMoney(r["Direct message sales"] as string),
            totalGross: salesGross,
            scheduledHours: parseHours(r["Scheduled hours"] as string),
            clockedHours: parseHours(r["Clocked hours"] as string),
          },
          create: {
            chatterId,
            modelId,
            date: normalizedDate,
            salesGross,
            ppvSalesGross: parseMoney(r["PPV sales"] as string),
            tipsGross: parseMoney(r["Tips"] as string),
            messagesGross: parseMoney(r["Direct message sales"] as string),
            totalGross: salesGross,
            scheduledHours: parseHours(r["Scheduled hours"] as string),
            clockedHours: parseHours(r["Clocked hours"] as string),
          },
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    await logAudit(session!.user.id, "IMPORT_CHATTER_DATA", "ChatterDailyData", undefined, {
      chatterId, modelId, imported, skipped, totalRows: rows.length,
    });

    return jsonSuccess({ imported, skipped, totalRows: rows.length });
  } catch (err: unknown) {
    console.error("[IMPORT CHATTER]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
