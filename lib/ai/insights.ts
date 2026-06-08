/**
 * Step 17 — AI table insights.
 *
 * Builds on the Step 1 co-pilot SDK plumbing: same Anthropic client, same
 * adaptive thinking + high effort, same prompt-caching strategy (schema
 * cached as ephemeral so repeated insights against the same connection
 * are cheap reads).
 *
 * Returns a structured TableInsights object: a one-paragraph summary +
 * three suggested queries with rationales.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ColumnInfo } from "@/server/actions/schema";

const SuggestedQuerySchema = z.object({
  name: z
    .string()
    .describe(
      "A short, action-oriented title for the query (e.g. 'Active users by plan')."
    ),
  sql: z
    .string()
    .describe(
      "A complete, ready-to-execute PostgreSQL query. Use this exact table + its real column names. No markdown fences."
    ),
  rationale: z
    .string()
    .describe(
      "One sentence on why this is useful. Plain prose, no markdown."
    ),
});

const TableInsightsSchema = z.object({
  summary: z
    .string()
    .describe(
      "A 2–3 sentence plain-English summary of what this table seems to track, inferred from column names and types. Be specific about likely purpose; don't restate the column list."
    ),
  suggested: z
    .array(SuggestedQuerySchema)
    .describe(
      "Exactly three useful starter queries against this table — typically: (1) a recent-rows lookup, (2) a meaningful aggregate, (3) a quality-check (e.g. nulls, duplicates, stale rows)."
    ),
});

export type SuggestedQuery = z.infer<typeof SuggestedQuerySchema>;
export type TableInsights = z.infer<typeof TableInsightsSchema>;

export type InsightsResult =
  | { ok: true; data: TableInsights; cached: boolean }
  | { ok: false; error: string; recoverable: boolean };

const SYSTEM_PROMPT = `You are Strata's table-insights helper. Given a single Postgres table's schema, you produce:
- a SUMMARY in 2–3 plain sentences explaining what the table tracks, inferred from column names and types
- exactly THREE suggested queries that a developer would find immediately useful

Rules:
- Use only the columns the user provides. Never invent columns or tables.
- All SQL must be syntactically valid Postgres. No markdown fences. Multi-line is fine.
- Prefer LIMIT 100 on row-level queries; aggregates can run unbounded.
- Make the three queries cover different intents (lookup / aggregate / quality-check).
- Names of queries should be short and action-oriented.
- If a column looks like it tracks time (created_at, updated_at, ts, placed_at, etc.) and you can use it for a time bound, do.
- If a column is nullable or has a meaningful default, your quality-check can target that.`;

export type ColumnsForInsight = Pick<
  ColumnInfo,
  "name" | "dataType" | "isNullable" | "isPrimaryKey" | "defaultValue"
>;

function renderTableContext(
  schema: string,
  tableName: string,
  columns: ColumnsForInsight[]
): string {
  const cols = columns
    .map((c) => {
      const flags: string[] = [];
      if (c.isPrimaryKey) flags.push("PK");
      if (!c.isNullable) flags.push("NOT NULL");
      if (c.defaultValue) flags.push(`DEFAULT ${c.defaultValue}`);
      const flagText = flags.length ? ` [${flags.join(", ")}]` : "";
      return `  - ${c.name} ${c.dataType}${flagText}`;
    })
    .join("\n");
  return `TABLE ${schema}.${tableName}\nCOLUMNS:\n${cols}`;
}

/**
 * Generate insights for a single table. Caller is responsible for
 * plan-gating + counting against the daily AI usage quota — same model
 * the SQL co-pilot already uses.
 */
export async function generateTableInsights(input: {
  schema: string;
  tableName: string;
  columns: ColumnsForInsight[];
  connectionLabel: string;
}): Promise<InsightsResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "AI insights aren't configured — set ANTHROPIC_API_KEY on the server.",
      recoverable: false,
    };
  }
  if (input.columns.length === 0) {
    return {
      ok: false,
      error: "This table has no columns to analyze.",
      recoverable: false,
    };
  }

  const tableContext = renderTableContext(
    input.schema,
    input.tableName,
    input.columns
  );
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-opus-4-7",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(TableInsightsSchema),
      },
      system: [
        { type: "text", text: SYSTEM_PROMPT },
        {
          type: "text",
          text: `Connection: ${input.connectionLabel}\n\n${tableContext}`,
          // Cache per-table — stable across repeat clicks on the same
          // table within the 5-minute TTL.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content:
            "Generate the summary and the three suggested queries for this table.",
        },
      ],
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return {
        ok: false,
        error: "The AI returned a response we couldn't parse.",
        recoverable: true,
      };
    }
    const cached = (response.usage?.cache_read_input_tokens ?? 0) > 0;
    return { ok: true, data: parsed, cached };
  } catch (err) {
    return mapAnthropicError(err);
  }
}

function mapAnthropicError(err: unknown): {
  ok: false;
  error: string;
  recoverable: boolean;
} {
  if (err instanceof Anthropic.AuthenticationError) {
    return {
      ok: false,
      error: "ANTHROPIC_API_KEY is invalid. Check the server config.",
      recoverable: false,
    };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return {
      ok: false,
      error: "Rate limited by the AI API. Try again in a few seconds.",
      recoverable: true,
    };
  }
  if (err instanceof Anthropic.APIError) {
    return {
      ok: false,
      error: "The AI service returned an error. Try again shortly.",
      recoverable: true,
    };
  }
  return {
    ok: false,
    error: "Unexpected error generating insights.",
    recoverable: true,
  };
}
