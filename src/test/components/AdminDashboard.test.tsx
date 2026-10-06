import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import { AuthorizationError } from "@/domain/auth/errors";
import {
  MAX_USERS_PER_READ,
  ensureUserRecord,
  fetchAllUsers,
  updateUserRole,
} from "@/services/userService";
import type { UserRecord } from "@/types/user";
import {
  act,
  fireEvent,
  renderWithProviders,
  screen,
  waitFor,
  within,
} from "../helpers/render";
import { makeUser, seedDoc, signInAs, timestamp } from "../helpers/firebase";
import { setMockRole } from "../helpers/userService";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const roster = vi.mocked(fetchAllUsers);
const assignRole = vi.mocked(updateUserRole);
const ensureRecord = vi.mocked(ensureUserRecord);

const JOINED = timestamp(new Date(2026, 0, 15));

const ADMIN: UserRecord = {
  uid: "admin-1",
  name: "Asha Verma",
  email: "asha@brt.in",
  role: "admin",
  createdAt: JOINED,
};

const DRIVER: UserRecord = {
  uid: "driver-9",
  name: "Ravi Kumar",
  email: "ravi@brt.in",
  role: "driver",
  createdAt: JOINED,
};

const PASSENGER: UserRecord = {
  uid: "rider-7",
  name: "Meena Sahu",
  email: "meena@example.com",
  role: "user",
  createdAt: JOINED,
};

const ROSTER = [ADMIN, DRIVER, PASSENGER];

beforeEach(() => {
  roster.mockResolvedValue({ users: ROSTER, truncated: false });
  assignRole.mockResolvedValue({ ok: true });
});

const asAdmin = () => {
  setMockRole("admin");
  signInAs(
    makeUser({ uid: "admin-1", displayName: "Asha Verma", email: "asha@brt.in" }),
    "admin"
  );
};

const showPanel = async (onError?: (message: string) => void) => {
  const rendered = renderWithProviders(<AdminDashboard onError={onError} />, {
    route: "/dashboard",
  });
  asAdmin();

  await screen.findByRole("heading", { name: "Administrator Panel" });
  await waitFor(() => expect(roster).toHaveBeenCalled());
  await act(async () => {
    await roster.mock.results[0]!.value.catch(() => undefined);
  });

  return rendered;
};

const rowFor = (name: string): HTMLElement =>
  within(screen.getByRole("table", { name: "Registered users and their roles" })).getByText(name).closest("tr")!;

const searchBox = () => screen.getByLabelText("Search users by name or email");

const resultCount = (): HTMLElement =>
  screen
    .getAllByRole("status")
    .find((region) => /users shown/.test(region.textContent ?? ""))!;

const statCard = (label: string): HTMLElement =>
  screen.getByText(label).parentElement!;

describe("who may open the administrator panel", () => {
  it("refuses a passenger", async () => {
    setMockRole("user");
    renderWithProviders(<AdminDashboard />, { route: "/dashboard" });
    signInAs(makeUser({ uid: "rider-7" }));

    expect(
      await screen.findByRole("heading", { name: "Access Denied" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Administrator Panel" })
    ).not.toBeInTheDocument();
  });

  it("refuses a driver", async () => {
    setMockRole("driver");
    renderWithProviders(<AdminDashboard />, { route: "/dashboard" });
    signInAs(makeUser({ uid: "driver-9" }), "driver");

    expect(
      await screen.findByRole("heading", { name: "Access Denied" })
    ).toBeInTheDocument();
  });

  it("never reads the roster for someone who may not see it", async () => {
    setMockRole("user");
    renderWithProviders(<AdminDashboard />, { route: "/dashboard" });
    signInAs(makeUser({ uid: "rider-7" }));

    await screen.findByRole("heading", { name: "Access Denied" });

    expect(roster).not.toHaveBeenCalled();
  });

  it("admits an administrator", async () => {
    await showPanel();

    expect(roster).toHaveBeenCalledTimes(1);
    expect(within(screen.getByRole("table", { name: "Registered users and their roles" })).getByText("asha@brt.in")).toBeInTheDocument();
  });
});

describe("loading the roster", () => {
  it("says it is still working", async () => {
    roster.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<AdminDashboard />, { route: "/dashboard" });
    asAdmin();

    expect(await screen.findByText("Loading users…")).toBeInTheDocument();
  });

  it("lists every account with its role", async () => {
    await showPanel();

    expect(within(rowFor("Asha Verma")).getByText(/Admin/)).toBeInTheDocument();
    expect(within(rowFor("Ravi Kumar")).getByText(/Driver/)).toBeInTheDocument();
    expect(within(rowFor("Meena Sahu")).getByText(/User/)).toBeInTheDocument();
  });

  it("counts each role", async () => {
    await showPanel();

    expect(within(statCard("Total Users")).getByText("3")).toBeInTheDocument();

    for (const label of ["Drivers", "Admins", "Passengers"]) {
      expect(within(statCard(label)).getByText("1")).toBeInTheDocument();
    }
  });

  it("says when nobody has registered", async () => {
    roster.mockResolvedValue({ users: [], truncated: false });

    await showPanel();

    expect(screen.getByText("No users yet")).toBeInTheDocument();
  });

  it("warns that a truncated roster is not the whole picture", async () => {
    roster.mockResolvedValue({ users: ROSTER, truncated: true });

    await showPanel();

    expect(
      screen.getByText(
        `Only the first ${MAX_USERS_PER_READ} accounts were loaded. Counts and search cover this subset only.`
      )
    ).toBeInTheDocument();
  });

  it("stays quiet about truncation when the roster is complete", async () => {
    await showPanel();

    expect(screen.queryByText(/Only the first/)).not.toBeInTheDocument();
  });

  it("reads the roster again on request", async () => {
    const { user } = await showPanel();

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => expect(roster).toHaveBeenCalledTimes(2));
  });
});

describe("when a record is incomplete", () => {
  it("falls back to the email prefix, then to Unknown", async () => {
    roster.mockResolvedValue({
      users: [
        { uid: "a", email: "nameless@brt.in", role: "user" },
        { uid: "b", role: "user" },
      ],
      truncated: false,
    });

    await showPanel();

    expect(screen.getByText("nameless")).toBeInTheDocument();

    /*
      Scoped to the roster table. "Unknown" is also a vehicle-reporting state
      in the fleet panel above, so an unscoped query matches whichever the
      test did not mean - and would have passed for the wrong reason if the
      fallback ever broke.
    */
    const roster_table = screen.getByRole("table", { name: /registered users/i });

    expect(within(roster_table).getByText("Unknown")).toBeInTheDocument();
  });

  it("shows the joined date, and N/A when there is none", async () => {
    roster.mockResolvedValue({
      users: [
        { uid: "a", name: "Dated", role: "user", createdAt: JOINED },
        { uid: "b", name: "Undated", role: "user" },
      ],
      truncated: false,
    });

    await showPanel();

    expect(
      within(rowFor("Dated")).getByText(JOINED.toDate().toLocaleDateString())
    ).toBeInTheDocument();
    expect(within(rowFor("Undated")).getAllByText("N/A").length).toBeGreaterThan(0);
  });

  it("survives a timestamp that cannot be read", async () => {
    roster.mockResolvedValue({
      users: [
        {
          uid: "a",
          name: "Broken",
          role: "user",
          createdAt: {
            toDate: () => {
              throw new Error("bad timestamp");
            },
          },
        },
      ],
      truncated: false,
    });

    await showPanel();

    expect(within(rowFor("Broken")).getAllByText("N/A").length).toBeGreaterThan(0);
  });
});

describe("searching the roster", () => {
  it("narrows by name", async () => {
    const { user } = await showPanel();

    await user.type(searchBox(), "ravi");

    expect(within(screen.getByRole("table", { name: "Registered users and their roles" })).getByText("Ravi Kumar")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table", { name: "Registered users and their roles" })).queryByText("Meena Sahu")
    ).not.toBeInTheDocument();
  });

  it("narrows by email regardless of case", async () => {
    const { user } = await showPanel();

    await user.type(searchBox(), "MEENA@EXAMPLE");

    expect(within(screen.getByRole("table", { name: "Registered users and their roles" })).getByText("Meena Sahu")).toBeInTheDocument();
    expect(
      within(screen.getByRole("table", { name: "Registered users and their roles" })).queryByText("Ravi Kumar")
    ).not.toBeInTheDocument();
  });

  it("names the term that matched nothing", async () => {
    const { user } = await showPanel();

    await user.type(searchBox(), "zzz");

    expect(screen.getByText('No users match "zzz"')).toBeInTheDocument();
  });

  it("restores the roster when the search is cleared", async () => {
    const { user } = await showPanel();

    await user.type(searchBox(), "zzz");
    await user.click(screen.getByRole("button", { name: "Clear search" }));

    expect(within(screen.getByRole("table", { name: "Registered users and their roles" })).getByText("Ravi Kumar")).toBeInTheDocument();
  });

  it("reports how much of the roster is showing", async () => {
    const { user } = await showPanel();

    expect(resultCount()).toHaveTextContent("3 of 3 users shown");

    await user.type(searchBox(), "ravi");

    expect(resultCount()).toHaveTextContent("1 of 3 users shown");
  });
});

describe("changing somebody's role", () => {
  const startEditing = async (
    user: Awaited<ReturnType<typeof showPanel>>["user"],
    name: string
  ) => {
    await user.click(
      within(rowFor(name)).getByRole("button", { name: `Edit role for ${name}` })
    );
  };

  const roleSelect = (name: string) =>
    screen.getByRole("combobox", { name: `Role for ${name}` });

  /*
    The gap this closes is not cosmetic. The Realtime Database gates position
    writes on `driverAllowlist`, which no client may write and which
    `setUserRole` does not touch, so the role granted here does not let anyone
    broadcast. An administrator who was told otherwise would hand out a driver
    account and then have no reason to look for the missing half.
  */
  it("says that the driver role alone does not enable broadcasting", async () => {
    await showPanel();

    const note = screen.getByRole("note");

    expect(note).toHaveTextContent(/driver role is not enough on its own/i);
    expect(note).toHaveTextContent(/driverAllowlist/);
    expect(note).toHaveTextContent(/Firebase console/i);
  });

  it("offers every role the system recognises", async () => {
    const { user } = await showPanel();

    await startEditing(user, "Meena Sahu");

    expect(
      within(roleSelect("Meena Sahu"))
        .getAllByRole("option")
        .map((option) => option.getAttribute("value"))
    ).toEqual(["user", "admin", "driver"]);
  });

  it("writes the chosen role and reports success", async () => {
    const { user } = await showPanel();

    await startEditing(user, "Meena Sahu");
    await user.selectOptions(roleSelect("Meena Sahu"), "driver");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(assignRole).toHaveBeenCalledWith(
        expect.objectContaining({ uid: "admin-1" }),
        "rider-7",
        "driver"
      )
    );

    const confirmation = await screen.findByText("Role updated successfully!");
    expect(confirmation.closest('[role="status"]')).toBeInTheDocument();
    expect(within(rowFor("Meena Sahu")).getByText(/Driver/)).toBeInTheDocument();
  });

  it("keeps the current role when the select reports one it does not recognise", async () => {
    const { user } = await showPanel();

    await startEditing(user, "Meena Sahu");

    fireEvent.change(roleSelect("Meena Sahu"), { target: { value: "superadmin" } });

    expect(roleSelect("Meena Sahu")).toHaveValue("user");
  });

  it("writes nothing when the edit is cancelled", async () => {
    const { user } = await showPanel();

    await startEditing(user, "Meena Sahu");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(assignRole).not.toHaveBeenCalled();
    expect(within(rowFor("Meena Sahu")).getByText(/User/)).toBeInTheDocument();
  });

  it("shows the reason the service refused", async () => {
    assignRole.mockResolvedValue({
      ok: false,
      message: "You are not allowed to do that.",
    });
    const onError = vi.fn();

    const { user } = await showPanel(onError);

    await startEditing(user, "Meena Sahu");
    await user.selectOptions(roleSelect("Meena Sahu"), "driver");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const refusal = await screen.findByText("You are not allowed to do that.");
    expect(refusal.closest('[role="alert"]')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith("You are not allowed to do that.");
    expect(screen.queryByText("Role updated successfully!")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(within(rowFor("Meena Sahu")).getByText(/User/)).toBeInTheDocument();
  });

  it("explains a write that threw without leaking the cause", async () => {
    assignRole.mockRejectedValue(new AuthorizationError());
    const onError = vi.fn();

    const { user } = await showPanel(onError);

    await startEditing(user, "Meena Sahu");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onError).toHaveBeenCalled());

    const message = onError.mock.calls[0]![0] as string;
    expect(screen.getByText(message).closest('[role="alert"]')).toBeInTheDocument();
  });

  it("re-reads your own session when you change your own role", async () => {
    const { user } = await showPanel();

    const before = ensureRecord.mock.calls.length;

    await startEditing(user, "Asha Verma");
    await user.selectOptions(roleSelect("Asha Verma"), "user");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(ensureRecord.mock.calls.length).toBeGreaterThan(before)
    );
  });

  it("leaves your session alone when you change somebody else", async () => {
    const { user } = await showPanel();

    const before = ensureRecord.mock.calls.length;

    await startEditing(user, "Meena Sahu");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(assignRole).toHaveBeenCalled());

    expect(ensureRecord.mock.calls.length).toBe(before);
  });
});

describe("when the roster cannot be read", () => {
  it("explains the failure and tells the page about it", async () => {
    roster.mockRejectedValue(new AuthorizationError());
    const onError = vi.fn();

    await showPanel(onError);

    await waitFor(() => expect(onError).toHaveBeenCalled());

    const message = onError.mock.calls[0]![0] as string;
    expect(screen.getByText(message).closest('[role="alert"]')).toBeInTheDocument();
  });

  it("lets the administrator dismiss the message", async () => {
    roster.mockRejectedValue(new AuthorizationError());

    const { user } = await showPanel();

    const dismiss = await screen.findByRole("button", {
      name: "Dismiss error message",
    });
    await user.click(dismiss);

    expect(
      screen.queryByRole("button", { name: "Dismiss error message" })
    ).not.toBeInTheDocument();
  });
});

describe("reaching the panel without a pointer", () => {
  it("labels the roster table", async () => {
    await showPanel();

    expect(
      screen.getByRole("table", { name: "Registered users and their roles" })
    ).toBeInTheDocument();
  });

  it("tells each edit button apart", async () => {
    await showPanel();

    for (const name of ["Asha Verma", "Ravi Kumar", "Meena Sahu"]) {
      expect(
        screen.getByRole("button", { name: `Edit role for ${name}` })
      ).toBeInTheDocument();
    }
  });
});

/*
  The administrative record, made readable.

  A write-only log satisfies the rule that nothing may be rewritten and
  answers nobody's question. This is the only place in the app where "who
  changed this account's access, and when?" can be asked.
*/
describe("the record of administrative acts", () => {
  const seedEntry = (id: string, over: Record<string, unknown> = {}) =>
    seedDoc("auditLog", id, {
      actorUid: "admin-1",
      at: { toDate: () => new Date("2026-09-01T10:00:00.000Z") },
      action: "ROLE_CHANGED",
      subject: "rider-1",
      detail: "user -> driver",
      ...over,
    });

  it("shows what changed, who changed it and when", async () => {
    seedEntry("a1");

    await showPanel();

    expect(await screen.findByText(/Role changed/)).toBeInTheDocument();
    expect(screen.getByText("rider-1")).toBeInTheDocument();
    expect(screen.getByText(/user -> driver/)).toBeInTheDocument();
  });

  it("names a published notice as its own kind of act", async () => {
    seedEntry("a1", {
      action: "ANNOUNCEMENT_PUBLISHED",
      subject: "notice-7",
      detail: "CRITICAL: Services suspended",
    });

    await showPanel();

    expect(await screen.findByText(/Notice published/)).toBeInTheDocument();
  });

  /*
    Nothing recorded is an ordinary state for a fresh deployment, and showing
    an error there would send an administrator looking for a fault that does
    not exist.
  */
  it("says nothing has been recorded rather than reporting a fault", async () => {
    await showPanel();

    expect(
      await screen.findByText(/No administrative changes have been recorded/i)
    ).toBeInTheDocument();
  });

  it("promises that entries cannot be edited or removed", async () => {
    await showPanel();

    expect(
      await screen.findByText(/cannot be edited or removed/i)
    ).toBeInTheDocument();
  });

  /*
    A record whose server timestamp has not resolved yet is real, not broken.
    Rendering the missing value as a date would put an administrative act in
    1970.
  */
  it("omits the time rather than inventing one when it is missing", async () => {
    seedEntry("a1", { at: null });

    await showPanel();

    await screen.findByText(/Role changed/);

    expect(screen.queryByText(/1970/)).not.toBeInTheDocument();
  });
});
