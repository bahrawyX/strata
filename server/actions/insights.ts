"use server";

import { z } from "zod";
import {
  generateTableInsights,
  type InsightsResult,
} from "@/lib/ai/insights";
import { getViewerPlan, tryConsumeCopilotQuota } from "@/lib/plan";
import { getConnectionById } from "./connections";
import { getTableColumns } from "./schema";
import { recordActivity } from "@/lib/activity";

const explainSchema = z.object({
  connectionId: z.string().uuid(),
  schema: z
    .string()
    .min(1)
    .max(64)
    .default("public"),
  tableName: z
    .string()
    .min(1)
    .max(128),
});

export type ExplainTableResult = InsightsResult & {
  usage?: { tier: "demo" | "free" | "pro"; used: number; limit: number };
};

/**
 * Generate an AI summary + 3 suggested queries for a single table.
 * Shares the daily co-pilot quota — generating insights costs one draft
 * against the user's plan, same as asking the co-pilot a question.
 */
export async function explainTable(input: {
  connectionId: string;
  schema?: string;
  tableName: string;
}): Promise<ExplainTableResult> {
  const parsed = explainSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      recoverable: true,
    };
  }

  // Atomic quota gate — same TOCTOU-safe consume pattern as askSqlCopilot.
  const plan = await getViewerPlan();
  const quota = await tryConsumeCopilotQuota(plan);
  if (!quota.ok) {
    return {
      ok: false,
      error:
        plan.tier === "demo"
          ? `You've used today's demo AI allowance (${quota.limit} requests).`
          : `You've hit today's AI cap (${quota.limit} requests). Resets at midnight UTC.`,
      recoverable: false,
    };
  }

  const conn = await getConnectionById(parsed.data.connectionId);
  if ("error" in conn) {
    return { ok: false, error: conn.error, recoverable: false };
  }

  const columns = await getTableColumns(
    parsed.data.connectionId,
    parsed.data.schema,
    parsed.data.tableName
  );
  if ("error" in columns) {
    return { ok: false, error: columns.error, recoverable: false };
  }
  if (columns.data.length === 0) {
    return {
      ok: false,
      error: "This table has no columns.",
      recoverable: false,
    };
  }

  const result = await generateTableInsights({
    schema: parsed.data.schema,
    tableName: parsed.data.tableName,
    columns: columns.data.map((c) => ({
      name: c.name,
      dataType: c.dataType,
      isNullable: c.isNullable,
      isPrimaryKey: c.isPrimaryKey,
      defaultValue: c.defaultValue,
    })),
    connectionLabel: conn.data.name,
  });

  // Resolve userId for the audit row — real viewers should land in their
  // own activity feed, demo viewers stay anonymous.
  const auditUserId =
    plan.viewer?.source === "real" ? plan.viewer.id : null;

  if (result.ok) {
    await recordActivity({
      userId: auditUserId,
      connectionId: parsed.data.connectionId,
      action: "copilot.draft",
      success: true,
      detail: `insights:${parsed.data.tableName}`,
    });
    return {
      ...result,
      usage: {
        tier: plan.tier,
        used: quota.used,
        limit: plan.copilotLimit,
      },
    };
  }

  // AI failure path — still record so the user sees the attempt in their
  // activity feed, with a bucketed reason instead of the raw error.
  await recordActivity({
    userId: auditUserId,
    connectionId: parsed.data.connectionId,
    action: "copilot.draft",
    success: false,
    detail: `insights:${parsed.data.tableName}:failed`,
  });

  return result;
}
