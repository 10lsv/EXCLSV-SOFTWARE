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

    for (const row of rows) {
      const r = row as Record<string, unknown>;
      const date = parseInflowwDate(r["Date/Time Europe/Brussels"] as string);
      if (!date) { skipped++; continue; }

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
      } catch {
        skipped++;
      }
    }

    await logAudit(session!.user.id, "IMPORT_MODEL_DATA", "InflowwDailyData", undefined, {
      modelId, imported, skipped, totalRows: rows.length,
    });

    return jsonSuccess({ imported, skipped, totalRows: rows.length });
  } catch (err: unknown) {
    console.error("[IMPORT MODEL]", err);
    return jsonError(err instanceof Error ? err.message : "Erreur interne", 500);
  }
}
