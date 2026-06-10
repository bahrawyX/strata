import Anthropic from "@anthropic-ai/sdk";

/**
 * Map Anthropic SDK errors to a user-facing string. Shared between the
 * co-pilot draft path and the table-insights path so we update one place
 * when the SDK adds a new error class (Overloaded, ContextWindow, etc.).
 *
 * `productLabel` is used in the generic-fallback case so the message
 * reads correctly for whichever feature called us ("co-pilot" vs
 * "insights").
 */
export function mapAnthropicError(
  err: unknown,
  productLabel = "co-pilot"
): {
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
    console.error(`${productLabel} APIError`, err.status, err.message);
    // 529 = overloaded — recoverable; 5xx in general is recoverable.
    if (err.status === 529 || (err.status && err.status >= 500)) {
      return {
        ok: false,
        error: "The AI is overloaded right now. Try again in a few seconds.",
        recoverable: true,
      };
    }
    return {
      ok: false,
      error: `The ${productLabel} couldn't complete that request. Try again later.`,
      recoverable: true,
    };
  }
  console.error(`${productLabel} unknown error`, err);
  return {
    ok: false,
    error: `Something went wrong calling the ${productLabel}.`,
    recoverable: true,
  };
}
