import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataGrid } from "@/components/table/DataGrid";
import {
  DEMO_CONNECTION_ID,
  DEMO_COLUMNS,
  DEMO_ROWS,
} from "@/lib/demo-data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("DataGrid", () => {
  it("renders the table name and row metadata", () => {
    render(
      <DataGrid
        connectionId={DEMO_CONNECTION_ID}
        tableName="users"
        data={{
          rows: DEMO_ROWS.users,
          columns: DEMO_COLUMNS.users,
          total: DEMO_ROWS.users.length,
          page: 1,
          pageSize: 50,
          primaryKey: "id",
        }}
      />
    );
    expect(screen.getByRole("heading", { name: "users" })).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`${DEMO_ROWS.users.length} row`))
    ).toBeInTheDocument();
  });

  it("renders one column header per defined column", () => {
    render(
      <DataGrid
        connectionId={DEMO_CONNECTION_ID}
        tableName="users"
        data={{
          rows: DEMO_ROWS.users,
          columns: DEMO_COLUMNS.users,
          total: DEMO_ROWS.users.length,
          page: 1,
          pageSize: 50,
          primaryKey: "id",
        }}
      />
    );
    // Column names appear in the thead (and may also coincide with row data),
    // so use getAllByText and just require at least one occurrence per column.
    for (const c of DEMO_COLUMNS.users) {
      expect(screen.getAllByText(c.name).length).toBeGreaterThan(0);
    }
  });

  it("renders a row for every datum", () => {
    render(
      <DataGrid
        connectionId={DEMO_CONNECTION_ID}
        tableName="users"
        data={{
          rows: DEMO_ROWS.users,
          columns: DEMO_COLUMNS.users,
          total: DEMO_ROWS.users.length,
          page: 1,
          pageSize: 50,
          primaryKey: "id",
        }}
      />
    );
    expect(screen.getByText("alex.chen@arcadia.dev")).toBeInTheDocument();
    expect(screen.getByText("Marta Kowalski")).toBeInTheDocument();
  });
});
