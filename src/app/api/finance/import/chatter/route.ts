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
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] as Record<string, unknown>;
      const date = parseChatterDate(r["Date/Time Europe/Brussels"] as string);
      if (!date) {
        errors.push({ row: i + 1, message: "Date invalide ou manquante" });
        skipped++;
        continue;
      }

      const normalizedDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const salesGross = parseMoney(r["Sales"] as string);
      const ppvSalesGross = parseMoney(r["PPV sales"] as string);
      const tipsGross = parseMoney(r["Tips"] as string);
      const messagesGross = parseMoney(r["Direct message sales"] as string);
      const totalGross = salesGross + ppvSalesGross + tipsGross + messagesGross;

      try {
        await prisma.chatterDailyData.upsert({
          where: {
            chatterId_modelId_date: { chatterId, modelId, date: normalizedDate },
          },
          update: {
            salesGross,
            ppvSalesGross,
            tipsGross,
            messagesGross,
            totalGross,
            scheduledHours: parseHours(r["Scheduled hours"] as string),
            clockedHours: parseHours(r["Clocked hours"] as string),
          },
          create: {
            chatterId,
            modelId,
            date: normalizedDate,
            salesGross,
            ppvSalesGross,
            tipsGross,
            messagesGross,
            totalGross,
            scheduledHours: parseHours(r["Scheduled hours"] as string),
            clockedHours: parseHours(r["Clocked hours"] as string),
          },
        });
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[IMPORT CHATTER] Row ${i + 1} skipped:`, msg);
        errors.push({ row: i + 1, message: msg });
        skipped++;
      }
    }

    // Create ImportLog
    await prisma.importLog.create({
      data: {
        type: "CHATTER",
        fileName: file.name,
        modelId,
        chatterId,
        totalRows: rows.length,
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
        importedBy: session!.user.id,
      },
    });

    await logAudit(session!.user.id, "IMPORT_CHATTER_DATA", "ChatterDailyData", undefined, {
      chatterId, modelId, imported, skipped, totalRows: rows.length,
    });

    return jsonSuccess({ imported, skipped, totalRows: rows.length, errors: errors.slice(0, 50) });
  } catch (err: unknown) {
    console.error("[IMPORT CHATTER]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
