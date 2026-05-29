import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { SchemaTableDiagram } from "@/server/actions/schema";

const CopilotResponseSchema = z.object({
  sql: z
    .string()
    .describe(
      "A complete, ready-to-execute PostgreSQL query that satisfies the user's request. Must be syntactically valid SQL. Do not wrap in markdown fences."
    ),
  explanation: z
    .string()
    .describe(
      "A one or two sentence explanation of what the query does and which tables/columns it uses. Plain prose, no markdown."
    ),
  warnings: z
    .array(z.string())
    .describe(
      "Zero or more concise warnings the user should know before running this query — for example, 'this will scan a large table without an index', 'this is a DELETE without a WHERE clause is dangerous'. Empty array if none."
    ),
});

export type CopilotResponse = z.infer<typeof CopilotResponseSchema>;

export type CopilotResult =
  | { ok: true; data: CopilotResponse; cached: boolean }
  | { ok: false; error: string; recoverable: boolean };

/**
 * Render the schema into a compact, deterministic text representation that
 * Claude can reason about. Sorted alphabetically so the same DB produces the
 * same bytes every time (prompt-cache friendly).
 */
export function renderSchemaContext(tables: SchemaTableDiagram[]): string {
  const sorted = [...tables].sort((a, b) => a.name.localeCompare(b.name));
  const lines: string[] = [];
  for (const t of sorted) {
    lines.push(`TABLE ${t.name} (`);
    for (const c of t.columns) {
      const tags: string[] = [c.type];
      if (c.primary) tags.push("PK");
      if (!c.nullable) tags.push("NOT NULL");
      if (c.references) {
        tags.push(`FK -> ${c.references.table}.${c.references.column}`);
      }
      lines.push(`  ${c.name} ${tags.join(", ")}`);
    }
    lines.push(`)`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

const SYSTEM_PROMPT = `You are Strata's SQL co-pilot — an expert PostgreSQL author embedded in a database workspace.

You receive the user's database schema (tables, columns, types, primary keys, foreign keys) and a plain-English question. You return a single, ready-to-run PostgreSQL query that answers it, plus a brief explanation and any safety warnings.

Rules:
- Use only the tables and columns shown in the schema. Never invent identifiers.
- Prefer JOINs that follow the declared foreign-key relationships.
- Quote identifiers only when needed (mixed case, reserved words). Use lowercase for the common cases.
- Use ANSI SQL where possible; Postgres-specific syntax when it materially helps (e.g. ILIKE, generate_series, jsonb operators, window functions).
- For aggregations, include the GROUP BY explicitly.
- Default to safe queries: SELECT with reasonable LIMIT when the user asks an exploratory question. Add a warning if the user explicitly asks for a destructive operation (UPDATE / DELETE / DROP).
- If the question is ambiguous, pick the most common interpretation and call out the assumption in the explanation.
- If the question cannot be answered with the given schema, return SQL that's the closest reasonable attempt AND set a warning explaining the gap.

Output:
- "sql" is the SQL only. No markdown fences, no inline comments unless they're load-bearing.
- "explanation" is one or two sentences in plain prose.
- "warnings" is empty unless the query is destructive, will scan a very large table, or makes an assumption the user should verify.`;

/**
 * Ask the SQL co-pilot to draft a query.
 *
 * Architecture notes:
 * - Opus 4.7 + adaptive thinking + effort: "high" — SQL drafting is
 *   intelligence-sensitive (per the claude-api skill, "high" is the
 *   recommended minimum for most intelligence-sensitive work).
 * - Structured output via `messages.parse(zodOutputFormat(...))` so the
 *   response is guaranteed to deserialize into { sql, explanation, warnings }.
 * - Prompt caching is applied to the system prompt + schema text. For larger
 *   schemas (≥ ~4K tokens) this pays for itself after two requests; for the
 *   demo schema it's a no-op (below the cacheable minimum) but still safe.
 */
export async function askCopilot(input: {
  schema: SchemaTableDiagram[];
  question: string;
  connectionLabel: string;
}): Promise<CopilotResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "AI co-pilot is not configured — set ANTHROPIC_API_KEY on the server to enable it.",
      recoverable: false,
    };
  }

  const trimmed = input.question.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "Ask a question first.",
      recoverable: true,
    };
  }
  if (trimmed.length > 2000) {
    return {
      ok: false,
      error: "Question is too long — keep it under 2000 characters.",
      recoverable: true,
    };
  }

  const schemaText = renderSchemaContext(input.schema);
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-opus-4-7",
      max_tokens: 16000,
      // Adaptive thinking — Claude decides when to think; high effort is the
      // baseline for SQL drafting per the claude-api skill.
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(CopilotResponseSchema),
      },
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
        },
        {
          type: "text",
          text: `Connection: ${input.connectionLabel}\n\nSCHEMA:\n${schemaText}`,
          // Cache the schema — stable across requests against the same DB.
          // Cheap reads (~0.1x) once the prefix is warm.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: trimmed,
        },
      ],
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return {
        ok: false,
        error:
          "The co-pilot returned a response I couldn't parse. Try rephrasing your question.",
        recoverable: true,
      };
    }

    const cached =
      (response.usage?.cache_read_input_tokens ?? 0) > 0;

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
      error: "Rate limited by the API. Try again in a few seconds.",
      recoverable: true,
    };
  }
  if (err instanceof Anthropic.APIError) {
    console.error("askCopilot APIError", err.status, err.message);
    // 529 = overloaded — recoverable; 5xx in general is recoverable.
    if (err.status === 529 || (err.status && err.status >= 500)) {
      return {
        ok: false,
        error: "The API is overloaded right now. Try again in a few seconds.",
        recoverable: true,
      };
    }
    return {
      ok: false,
      error:
        "The co-pilot couldn't complete that request. Try rephrasing or check back later.",
      recoverable: true,
    };
  }
  console.error("askCopilot unknown error", err);
  return {
    ok: false,
    error: "Something went wrong calling the co-pilot.",
    recoverable: true,
  };
}
