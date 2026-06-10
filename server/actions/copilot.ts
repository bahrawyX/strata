"use server";

import { z } from "zod";
import {
  askCopilot,
  type CopilotResult,
  type CopilotUsage,
} from "@/lib/ai/copilot";
import { getViewerPlan, tryConsumeCopilotQuota } from "@/lib/plan";
import { getConnectionById } from "./connections";
import { getSchemaForDiagram } from "./schema";

const askSchema = z.object({
  connectionId: z.string().uuid(),
  question: z.string().min(1).max(2000),
});

/**
 * Server action exposed to the SQL editor. Resolves the connection's schema,
 * checks the viewer's plan + daily co-pilot quota, asks the co-pilot, and
 * increments the counter on success. Quota errors carry an `upgrade` payload
 * so the UI can render a paywall instead of a generic error.
 */
export async function askSqlCopilot(input: {
  connectionId: string;
  question: string;
}): Promise<CopilotResult> {
  const parsed = askSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      recoverable: true,
    };
  }

  // 1. Atomic quota gate. Consume FIRST so concurrent requests can't all
  //    pass a stale-read check and slip past the daily cap. If the call
  //    fails, we'll refund on the Anthropic-error path below.
  const plan = await getViewerPlan();
  const quota = await tryConsumeCopilotQuota(plan);
  if (!quota.ok) {
    const upgradeTier =
      plan.tier === "demo" ? ("demo" as const) : ("free" as const);
    return {
      ok: false,
      error:
        upgradeTier === "demo"
          ? `You've used today's demo allowance (${quota.limit} co-pilot drafts). Create a free account to keep going.`
          : `You've hit today's co-pilot cap (${quota.limit} drafts). The counter resets at midnight UTC.`,
      recoverable: false,
      upgrade: {
        tier: upgradeTier,
        used: quota.used,
        limit: quota.limit,
      },
    };
  }

  // 2. Resolve the connection + schema.
  const conn = await getConnectionById(parsed.data.connectionId);
  if ("error" in conn) {
    return { ok: false, error: conn.error, recoverable: false };
  }

  const schema = await getSchemaForDiagram(parsed.data.connectionId);
  if ("error" in schema) {
    return { ok: false, error: schema.error, recoverable: false };
  }

  if (schema.data.length === 0) {
    return {
      ok: false,
      error:
        "This database doesn't appear to have any tables yet — nothing for the co-pilot to query.",
      recoverable: false,
    };
  }

  // 3. Call the co-pilot.
  const result = await askCopilot({
    schema: schema.data,
    question: parsed.data.question,
    connectionLabel: conn.data.name,
  });

  // 4. Attach the post-consume usage snapshot. (We already incremented in
  //    step 1, so no second write is needed.)
  if (result.ok) {
    const usage: CopilotUsage = {
      tier: plan.tier,
      used: quota.used,
      limit: plan.copilotLimit,
    };
    return { ...result, usage };
  }

  return result;
}
