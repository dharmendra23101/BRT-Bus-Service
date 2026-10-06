import { describe, expect, it, vi } from "vitest";
import AnnouncementManager from "@/components/dashboards/AnnouncementManager";
import { renderWithProviders, screen, waitFor } from "../helpers/render";
import { makeUser, readDoc, seedDoc, signInAs } from "../helpers/firebase";
import { setMockRole } from "../helpers/userService";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const asAdmin = () => {
  setMockRole("admin");
  signInAs(makeUser({ uid: "admin-1", displayName: "Ops" }), "admin");
};

const asPassenger = () => {
  setMockRole("user");
  signInAs(makeUser({ uid: "user-1" }), "user");
};

const seedAnnouncement = (id: string, over: Record<string, unknown> = {}) =>
  seedDoc("announcements", id, {
    title: "Sector 27 stop closed",
    body: "Board at Sector 29 until further notice.",
    severity: "WARNING",
    active: true,
    ...over,
  });

const publishForm = async () => {
  await screen.findByRole("heading", { name: "Passenger Announcements" });

  return {
    title: screen.getByLabelText("Title"),
    body: screen.getByLabelText("Message"),
    severity: screen.getByLabelText("Severity"),
    submit: screen.getByRole("button", { name: /publish announcement/i }),
  };
};

describe("who may author a notice", () => {
  it("shows nothing at all to a passenger", async () => {
    renderWithProviders(<AnnouncementManager />);
    asPassenger();

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Passenger Announcements" })
      ).not.toBeInTheDocument()
    );
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
  });

  it("opens for an administrator", async () => {
    renderWithProviders(<AnnouncementManager />);
    asAdmin();

    expect(
      await screen.findByRole("heading", { name: "Passenger Announcements" })
    ).toBeInTheDocument();
  });
});

describe("publishing a notice", () => {
  it("stores what the administrator wrote", async () => {
    const { user } = renderWithProviders(<AnnouncementManager />);
    asAdmin();

    const form = await publishForm();

    await user.type(form.title, "Sector 27 stop closed");
    await user.type(form.body, "Board at Sector 29 until further notice.");
    await user.selectOptions(form.severity, "WARNING");
    await user.click(form.submit);

    await waitFor(() =>
      expect(readDoc("announcements", "generated-1")).toMatchObject({
        title: "Sector 27 stop closed",
        severity: "WARNING",
        active: true,
      })
    );
  });

  it("lists it straight away without a reload", async () => {
    const { user } = renderWithProviders(<AnnouncementManager />);
    asAdmin();

    const form = await publishForm();

    await user.type(form.title, "New timetable published");
    await user.type(form.body, "Weekend times have changed.");
    await user.click(form.submit);

    await waitFor(() =>
      expect(screen.getAllByText(/New timetable published/).length).toBeGreaterThan(0)
    );
  });

  it("refuses to publish an empty notice", async () => {
    const { user } = renderWithProviders(<AnnouncementManager />);
    asAdmin();

    const form = await publishForm();

    await user.click(form.submit);

    expect(await screen.findByText(/A title is required/i)).toBeInTheDocument();
  });

  it("writes nothing when it refuses", async () => {
    const { user } = renderWithProviders(<AnnouncementManager />);
    asAdmin();

    const form = await publishForm();

    await user.click(form.submit);
    await screen.findByText(/A title is required/i);

    expect(readDoc("announcements", "generated-1")).toBeUndefined();
  });
});

describe("managing what is already published", () => {
  it("lists a retired notice as retired", async () => {
    seedAnnouncement("a1", { active: false });

    renderWithProviders(<AnnouncementManager />);
    asAdmin();

    expect(await screen.findByText("Retired")).toBeInTheDocument();
  });

  it("takes a notice off the site", async () => {
    seedAnnouncement("a1");

    const { user } = renderWithProviders(<AnnouncementManager />);
    asAdmin();

    await user.click(await screen.findByRole("button", { name: /^Retire/ }));

    await waitFor(() =>
      expect(readDoc("announcements", "a1")).toMatchObject({ active: false })
    );
  });

  it("removes a notice permanently", async () => {
    seedAnnouncement("a1");

    const { user } = renderWithProviders(<AnnouncementManager />);
    asAdmin();

    await user.click(await screen.findByRole("button", { name: /^Delete/ }));

    await waitFor(() => expect(readDoc("announcements", "a1")).toBeUndefined());
  });

  it("says so when nothing has been published", async () => {
    renderWithProviders(<AnnouncementManager />);
    asAdmin();

    expect(
      await screen.findByText(/Nothing has been published yet/)
    ).toBeInTheDocument();
  });
});

describe("saying what a notice affects", () => {
  /*
    Signing in after render sends an auth update through the provider, and if
    it lands while the form is being filled in, the fields reset and the
    publish silently carries nothing. The empty-roster line renders only once
    the fetch this component performs has resolved, so awaiting it is the
    barrier the component itself waits on - not a negative one that is briefly
    true before the work starts.
  */
  const openForm = async () => {
    const { user } = renderWithProviders(<AnnouncementManager />);
    asAdmin();

    await screen.findByText(/Nothing has been published yet/);

    const form = await publishForm();

    await user.type(form.title, "Sector 27 stop closed");
    await user.type(form.body, "Board at Sector 29 until further notice.");

    return { user, form };
  };

  const addRow = async (
    user: Awaited<ReturnType<typeof openForm>>["user"],
    route: string | null,
    stop: string | null
  ) => {
    if (route) await user.selectOptions(screen.getByLabelText("Route"), route);
    if (stop) await user.selectOptions(screen.getByLabelText("Stop"), stop);

    await user.click(screen.getByRole("button", { name: "Add" }));
  };

  const published = () => readDoc("announcements", "generated-1");

  it("tells every passenger when nothing is added", async () => {
    const { user, form } = await openForm();

    await user.click(form.submit);

    await waitFor(() =>
      expect(published()).toMatchObject({ title: "Sector 27 stop closed" })
    );

    /*
      Absent, not undefined. Firestore refuses an undefined field value, so a
      notice about the whole network - which is most of them - would fail to
      publish in production while passing against an in-memory double.
    */
    for (const field of ["informedEntities", "startsAt", "endsAt"]) {
      expect(Object.keys(published()!)).not.toContain(field);
    }
  });

  /*
    The AND case. A route and a stop chosen together in one row mean route 101
    AT CBD - a single selector - not route 101 anywhere plus CBD on any route.
  */
  it("reads one row as that route at that stop", async () => {
    const { user, form } = await openForm();

    await addRow(user, "101", "CBD");

    expect(await screen.findByText("Route 101 at CBD")).toBeInTheDocument();

    await user.click(form.submit);

    await waitFor(() =>
      expect(published()).toMatchObject({
        informedEntities: [{ routeId: "101", stopId: "CBD" }],
      })
    );
  });

  /*
    The OR case, and the reason the form asks for one thing at a time. Two
    independent tick-lists would produce the row above while the administrator
    believed they had said this, and nothing downstream could tell them apart.
  */
  it("reads two rows as either one", async () => {
    const { user, form } = await openForm();

    await addRow(user, "101", null);
    await addRow(user, null, "CBD");

    await user.click(form.submit);

    await waitFor(() =>
      expect(published()).toMatchObject({
        informedEntities: [{ routeId: "101" }, { stopId: "CBD" }],
      })
    );
  });

  it("lets an administrator take a row off again", async () => {
    const { user } = await openForm();

    await addRow(user, "101", null);

    await user.click(
      await screen.findByRole("button", { name: "Remove Route 101" })
    );

    expect(
      screen.queryByRole("button", { name: "Remove Route 101" })
    ).not.toBeInTheDocument();
  });

  it("will not add a row that selects nothing", async () => {
    await openForm();

    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("stores the window a notice applies in", async () => {
    const { user, form } = await openForm();

    await user.type(screen.getByLabelText("Starts"), "2026-09-01T06:00");
    await user.type(screen.getByLabelText("Ends"), "2026-09-01T22:00");
    await user.click(form.submit);

    await waitFor(() =>
      expect(published()).toMatchObject({
        startsAt: new Date("2026-09-01T06:00").getTime(),
        endsAt: new Date("2026-09-01T22:00").getTime(),
      })
    );
  });
});
