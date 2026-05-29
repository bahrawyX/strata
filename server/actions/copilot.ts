"use server";

import { z } from "zod";
import { askCopilot, type CopilotResult } from "@/lib/ai/copilot";
import { getConnectionById } from "./connections";
import { getSchemaForDiagram } from "./schema";

const askSchema = z.object({
  connectionId: z.string().uuid(),
  question: z.string().min(1).max(2000),
});

/**
 * Server action exposed to the SQL editor. Resolves the connection's schema,
 * then asks the co-pilot to draft a query.
 *
 * Demo connections short-circuit to the canned demo schema (already what
 * getSchemaForDiagram returns for them). Real connections fetch the schema
 * from the user's Postgres via the existing introspection action.
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

  return askCopilot({
    schema: schema.data,
    question: parsed.data.question,
    connectionLabel: conn.data.name,
  });
}
