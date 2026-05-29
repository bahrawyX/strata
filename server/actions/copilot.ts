"use server";

import { z } from "zod";
import {
  askCopilot,
  type CopilotResult,
  type CopilotUsage,
} from "@/lib/ai/copilot";
import { getViewerPlan, incrementCopilotUsage } from "@/lib/plan";
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

  // 1. Plan gate — check the viewer's quota BEFORE we pay for any tokens.
  const plan = await getViewerPlan();
  if (plan.copilotUsedToday >= plan.copilotLimit) {
    if (plan.tier === "pro") {
      // Should not happen — pro limit is Infinity — but guard anyway.
      return {
        ok: false,
        error: "Unexpected plan state. Try again in a few minutes.",
        recoverable: true,
      };
    }
    const upgradeTier = plan.tier === "demo" ? ("demo" as const) : ("free" as const);
    return {
      ok: false,
      error:
        upgradeTier === "demo"
          ? "You've used your 3 free co-pilot drafts. Sign up to keep going — 5 per day on the free plan."
          : "You've hit today's free co-pilot limit (5/day). Upgrade to Pro for unlimited drafts.",
      recoverable: false,
      upgrade: {
        tier: upgradeTier,
        used: plan.copilotUsedToday,
        limit: plan.copilotLimit,
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

  // 4. On success, atomically increment today's counter and attach the
  //    updated usage snapshot to the response.
  if (result.ok) {
    try {
      await incrementCopilotUsage(plan);
    } catch (err) {
      console.error("incrementCopilotUsage failed", err);
      // We've already burned the tokens — surface the draft anyway, but
      // skip the usage badge.
    }
    const usage: CopilotUsage = {
      tier: plan.tier,
      used: plan.copilotUsedToday + 1,
      limit: plan.copilotLimit,
    };
    return { ...result, usage };
  }

  return result;
}
