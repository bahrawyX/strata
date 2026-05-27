import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewConnectionForm from "@/components/connections/NewConnectionForm";

// next/navigation isn't available outside a Next app; stub it for tests.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("NewConnectionForm", () => {
  it("renders all form fields", () => {
    render(<NewConnectionForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText(/connection name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/connection string/i)).toBeInTheDocument();
  });

  it("shows validation error for empty name on submit", async () => {
    const user = userEvent.setup();
    render(<NewConnectionForm onSubmit={vi.fn()} />);
    await user.click(
      screen.getByRole("button", { name: /test & save|connect/i })
    );
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid connection string", async () => {
    const user = userEvent.setup();
    render(<NewConnectionForm onSubmit={vi.fn()} />);
    await user.type(screen.getByLabelText(/connection name/i), "My DB");
    await user.type(
      screen.getByLabelText(/connection string/i),
      "mysql://not-postgres"
    );
    await user.click(
      screen.getByRole("button", { name: /test & save|connect/i })
    );
    await waitFor(() => {
      expect(screen.getByText(/valid postgresql/i)).toBeInTheDocument();
    });
  });

  it("calls the injected onSubmit with a valid input shape", async () => {
    const user = userEvent.setup();
    const mockAction = vi.fn().mockResolvedValue({
      data: { id: "00000000-0000-4000-8000-000000000001" },
    });
    render(<NewConnectionForm onSubmit={mockAction} />);
    await user.type(screen.getByLabelText(/connection name/i), "Prod DB");
    await user.type(
      screen.getByLabelText(/connection string/i),
      "postgresql://user:pass@host:5432/mydb"
    );
    await user.click(
      screen.getByRole("button", { name: /test & save|connect/i })
    );
    await waitFor(() => {
      expect(mockAction).toHaveBeenCalledTimes(1);
    });
    const call = mockAction.mock.calls[0][0];
    expect(call).toMatchObject({
      name: "Prod DB",
      connectionString: "postgresql://user:pass@host:5432/mydb",
      dbType: "neon",
    });
  });

  it("disables submit button while loading", async () => {
    const user = userEvent.setup();
    const slowAction = vi.fn().mockImplementation(
      () =>
        new Promise((r) =>
          setTimeout(() => r({ data: { id: "x" } }), 200)
        )
    );
    render(<NewConnectionForm onSubmit={slowAction} />);
    await user.type(screen.getByLabelText(/connection name/i), "Test");
    await user.type(
      screen.getByLabelText(/connection string/i),
      "postgresql://u:p@h:5432/d"
    );
    await user.click(
      screen.getByRole("button", { name: /test & save|connect/i })
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /testing|connecting|loading|saving/i,
        })
      ).toBeDisabled();
    });
  });

  it("surfaces server-side error messages inline", async () => {
    const user = userEvent.setup();
    const failingAction = vi.fn().mockResolvedValue({
      error: "Could not connect to the database.",
    });
    render(<NewConnectionForm onSubmit={failingAction} />);
    await user.type(screen.getByLabelText(/connection name/i), "Bad DB");
    await user.type(
      screen.getByLabelText(/connection string/i),
      "postgresql://nope@nowhere:5432/db"
    );
    await user.click(
      screen.getByRole("button", { name: /test & save|connect/i })
    );
    await waitFor(() => {
      expect(screen.getByText(/could not connect/i)).toBeInTheDocument();
    });
  });
});
