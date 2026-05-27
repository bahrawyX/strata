import { describe, it, expect } from "vitest";
import {
  DEMO_COLUMNS,
  DEMO_SCHEMA_DIAGRAM,
  DEMO_TABLES,
} from "@/lib/demo-data";

describe("Demo schema diagram shape (matches the bahrawy <Schema /> contract)", () => {
  it("covers every demo table", () => {
    const tableNames = new Set(DEMO_SCHEMA_DIAGRAM.map((t) => t.name));
    for (const t of DEMO_TABLES) {
      expect(tableNames.has(t.name)).toBe(true);
    }
  });

  it("emits the auto-layout grid: 4 columns wide, 300px x-step, 260px y-step", () => {
    DEMO_SCHEMA_DIAGRAM.forEach((t, i) => {
      expect(t.x).toBe((i % 4) * 300 + 24);
      expect(t.y).toBe(Math.floor(i / 4) * 260 + 28);
    });
  });

  it("marks one primary-key column per table", () => {
    for (const t of DEMO_SCHEMA_DIAGRAM) {
      const pks = t.columns.filter((c) => c.primary);
      expect(pks.length).toBe(1);
      expect(pks[0].name).toBe("id");
    }
  });

  it("includes FK references for known relationships", () => {
    const ordersTable = DEMO_SCHEMA_DIAGRAM.find((t) => t.name === "orders");
    expect(ordersTable).toBeTruthy();
    const userIdCol = ordersTable!.columns.find((c) => c.name === "user_id");
    expect(userIdCol?.references).toEqual({ table: "users", column: "id" });
  });

  it("column types come straight from the demo column definitions", () => {
    for (const t of DEMO_SCHEMA_DIAGRAM) {
      const expected = DEMO_COLUMNS[t.name];
      expect(t.columns.length).toBe(expected.length);
      t.columns.forEach((c, i) => {
        expect(c.type).toBe(expected[i].dataType);
      });
    }
  });
});
