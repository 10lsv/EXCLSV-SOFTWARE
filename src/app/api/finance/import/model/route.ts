import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { jsonSuccess, jsonError, requireRole, logAudit } from "@/lib/api-utils";
import { parseXlsx, getSheet, sheetToJson, parseMoney, parseInflowwDate } from "@/lib/xlsx-parser";

// POST /api/finance/import/model — import model XLSX from Infloww
export async function POST(req: NextRequest) {
  const { error, session } = await requireRole(Role.OWNER, Role.ADMIN);
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const modelId = formData.get("modelId") as string | null;

    if (!file || !modelId) return jsonError("file et modelId requis");

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = parseXlsx(buffer);
    const sheet = getSheet(wb, "Creator Statistics Detail", "Creator Statistics");

    if (!sheet) return jsonError("Aucune feuille trouvée dans le fichier");

    const rows = sheetToJson(sheet);
    let imported = 0;
    let skipped = 0;
    let totalAmount = 0;
    const importedDates: Date[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] as Record<string, unknown>;
      const date = parseInflowwDate(r["Date/Time Europe/Brussels"] as string);
      if (!date) {
        errors.push({ row: i + 1, message: "Date invalide ou manquante" });
        skipped++;
        continue;
      }

      const normalizedDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

      try {
        await prisma.inflowwDailyData.upsert({
          where: { modelId_date: { modelId, date: normalizedDate } },
          update: {
            subsGross: parseMoney(r["Subscription Gross"] as string),
            tipsGross: parseMoney(r["Tips Gross"] as string),
            totalEarningsGross: parseMoney(r["Total earnings Gross"] as string),
            contributionPct: r["Contribution %"] ? parseFloat(String(r["Contribution %"])) : null,
            ofRanking: r["OF ranking"] ? parseInt(String(r["OF ranking"])) : null,
            following: r["Following"] ? parseInt(String(r["Following"])) : null,
            renewOnPct: r["Renew on %"] ? parseFloat(String(r["Renew on %"])) : null,
            newFans: r["New fans"] ? parseInt(String(r["New fans"])) : null,
            activeFans: r["Active fans"] ? parseInt(String(r["Active fans"])) : null,
            expiredFanChange: r["Change in expired fan count"] ? parseInt(String(r["Change in expired fan count"])) : null,
            postsGross: parseMoney(r["Posts Gross"] as string),
            messagesGross: parseMoney(r["Message Gross"] as string),
            streamsGross: parseMoney(r["Streams Gross"] as string),
            refundGross: parseMoney(r["Refund Gross"] as string),
          },
          create: {
            modelId,
            date: normalizedDate,
            subsGross: parseMoney(r["Subscription Gross"] as string),
            tipsGross: parseMoney(r["Tips Gross"] as string),
            totalEarningsGross: parseMoney(r["Total earnings Gross"] as string),
            contributionPct: r["Contribution %"] ? parseFloat(String(r["Contribution %"])) : null,
            ofRanking: r["OF ranking"] ? parseInt(String(r["OF ranking"])) : null,
            following: r["Following"] ? parseInt(String(r["Following"])) : null,
            renewOnPct: r["Renew on %"] ? parseFloat(String(r["Renew on %"])) : null,
            newFans: r["New fans"] ? parseInt(String(r["New fans"])) : null,
            activeFans: r["Active fans"] ? parseInt(String(r["Active fans"])) : null,
            expiredFanChange: r["Change in expired fan count"] ? parseInt(String(r["Change in expired fan count"])) : null,
            postsGross: parseMoney(r["Posts Gross"] as string),
            messagesGross: parseMoney(r["Message Gross"] as string),
            streamsGross: parseMoney(r["Streams Gross"] as string),
            refundGross: parseMoney(r["Refund Gross"] as string),
          },
        });
        imported++;
        importedDates.push(normalizedDate);
        totalAmount += parseMoney(r["Total earnings Gross"] as string);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[IMPORT MODEL] Row ${i + 1} skipped:`, msg);
        errors.push({ row: i + 1, message: msg });
        skipped++;
      }
    }

    // Compute period from imported dates
    const sortedDates = importedDates.sort((a, b) => a.getTime() - b.getTime());
    const periodStart = sortedDates.length > 0 ? sortedDates[0] : undefined;
    const periodEnd = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : undefined;

    // Create ImportLog
    await prisma.importLog.create({
      data: {
        type: "MODEL",
        fileName: file.name,
        modelId,
        periodStart,
        periodEnd,
        totalRows: rows.length,
        imported,
        skipped,
        totalAmount: Math.round(totalAmount * 100) / 100,
        errors: errors.length > 0 ? errors : undefined,
        importedBy: session!.user.id,
      },
    });

    await logAudit(session!.user.id, "IMPORT_MODEL_DATA", "InflowwDailyData", undefined, {
      modelId, imported, skipped, totalRows: rows.length,
    });

    return jsonSuccess({ imported, skipped, totalRows: rows.length, errors: errors.slice(0, 50) });
  } catch (err: unknown) {
    console.error("[IMPORT MODEL]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
