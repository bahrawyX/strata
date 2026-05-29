import { describe, it, expect } from "vitest";
import {
  getSchemaForAutocomplete,
} from "@/server/actions/schema";
import { DEMO_CONNECTION_ID, DEMO_SCHEMA_DIAGRAM } from "@/lib/demo-data";

describe("getSchemaForAutocomplete", () => {
  it("returns the demo schema as { tables: [{ name, columns: [name] }, ...] }", async () => {
    const result = await getSchemaForAutocomplete(DEMO_CONNECTION_ID);
    expect(result.tables.length).toBe(DEMO_SCHEMA_DIAGRAM.length);

    // Every demo table should be represented, with the exact column list.
    for (const expected of DEMO_SCHEMA_DIAGRAM) {
      const actual = result.tables.find((t) => t.name === expected.name);
      expect(actual).toBeDefined();
      const expectedCols = expected.columns.map((c) => c.name);
      expect(actual!.columns).toEqual(expectedCols);
    }
  });

  it("returns an empty list for an unauthorized non-demo connection (never throws)", async () => {
    // A random uuid the demo guard rejects, with no session = the action
    // returns { tables: [] } rather than surfacing a session error to the
    // editor.
    const result = await getSchemaForAutocomplete(
      "11111111-1111-4111-8111-111111111111"
    );
    expect(result.tables).toEqual([]);
  });

  it("never returns columns with type metadata (autocomplete payload is name-only)", async () => {
    const result = await getSchemaForAutocomplete(DEMO_CONNECTION_ID);
    for (const t of result.tables) {
      for (const c of t.columns) {
        expect(typeof c).toBe("string");
      }
    }
  });
});
