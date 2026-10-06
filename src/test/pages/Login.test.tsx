import { afterEach, describe, expect, it, vi } from "vitest";
import { signInWithPopup } from "firebase/auth";
import Login from "@/pages/Login";
import { renderWithProviders, screen } from "../helpers/render";
import { queueAuthError } from "../helpers/firebase";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const CREDENTIALS = "Incorrect email or password.";

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
};

afterEach(() => setViewportWidth(1024));

const signIn = async (
  user: ReturnType<typeof renderWithProviders>["user"],
  email: string,
  password: string
) => {
  await user.type(screen.getByLabelText(/^Email/), email);
  await user.type(screen.getByLabelText(/^Password/), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
};

describe("checking what was typed", () => {
  it("reports an empty form field by field", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(
      screen.getByText("Password must be at least 6 characters")
    ).toBeInTheDocument();
  });

  it("puts the cursor on the first field that failed", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await screen.findByText("Email is required");

    expect(screen.getByLabelText(/^Email/)).toHaveFocus();
  });

  it("rejects an address that is not an address", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    await signIn(user, "not-an-address", "correct-horse");

    expect(
      await screen.findByText("Please enter a valid email address")
    ).toBeInTheDocument();
  });

  it("marks the field it rejected for a screen reader", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    await signIn(user, "not-an-address", "correct-horse");

    await screen.findByText("Please enter a valid email address");

    expect(screen.getByLabelText(/^Email/)).toHaveAttribute("aria-invalid", "true");
  });
});

describe("refusing a sign-in", () => {
  it("does not confirm that the password was the wrong part", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    queueAuthError("auth/wrong-password");
    await signIn(user, "rider@example.com", "correct-horse");

    expect(await screen.findAllByText(CREDENTIALS)).not.toHaveLength(0);
  });

  it("answers an unregistered address exactly the same way", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    queueAuthError("auth/user-not-found");
    await signIn(user, "stranger@example.com", "correct-horse");

    expect(await screen.findAllByText(CREDENTIALS)).not.toHaveLength(0);
  });
});

describe("the other ways in", () => {
  it("hands off to the Google provider", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    await user.click(screen.getByRole("button", { name: /continue with google/i }));

    expect(vi.mocked(signInWithPopup)).toHaveBeenCalled();
  });

  it("swaps to registration and back", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(
      await screen.findByRole("heading", { name: "Create account" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("heading", { name: "Sign in" })
    ).toBeInTheDocument();
  });

  it("checks a registration before sending it", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    await user.click(await screen.findByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
  });
});

describe("on a narrow screen", () => {
  it("mounts one set of fields rather than two", async () => {
    setViewportWidth(400);

    renderWithProviders(<Login />, { route: "/login" });

    expect(
      await screen.findByRole("heading", { name: "Sign in" })
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^Email/)).toHaveLength(1);
    expect(screen.getAllByLabelText(/^Password/)).toHaveLength(1);
  });

  it("still offers registration", async () => {
    setViewportWidth(400);

    const { user } = renderWithProviders(<Login />, { route: "/login" });

    await user.click(await screen.findByRole("button", { name: "Sign up" }));

    expect(
      await screen.findByRole("heading", { name: "Create account" })
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^Email/)).toHaveLength(1);
  });
});

describe("revealing the password", () => {
  it("switches the field between hidden and visible", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    const field = screen.getByLabelText(/^Password/);
    expect(field).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(field).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});

describe("recovering a forgotten password", () => {
  const openReset = async (user: ReturnType<typeof renderWithProviders>["user"]) => {
    await user.click(screen.getByRole("button", { name: /forgot password/i }));
  };

  it("offers a way back in from the sign-in form", () => {
    renderWithProviders(<Login />, { route: "/login" });

    expect(
      screen.getByRole("button", { name: /forgot password/i })
    ).toBeInTheDocument();
  });

  it("sends a link to the address given", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    await openReset(user);
    await user.type(screen.getByLabelText(/^Email/), "rider@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(
      await screen.findByText(/if an account exists for/i)
    ).toBeInTheDocument();
  });

  /*
    Match the visible paragraph, not the phrase it shares with the spoken
    announcement. Both say "reset link is on its way", so a query on that
    substring matches one node or two depending on where LiveAnnouncer is in
    its clear-then-set cycle - which made this suite fail about one run in
    three, on a different test each time.
  */
  it("says the same thing when the address has no account", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    await openReset(user);
    await user.type(screen.getByLabelText(/^Email/), "nobody@example.com");

    queueAuthError("auth/user-not-found");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(
      await screen.findByText(/if an account exists for/i)
    ).toBeInTheDocument();
  });

  it("refuses an address that is not an address", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    await openReset(user);
    await user.type(screen.getByLabelText(/^Email/), "not-an-address");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(
      await screen.findByText("Please enter a valid email address")
    ).toBeInTheDocument();
  });

  it("reports a failure the passenger can act on", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    await openReset(user);
    await user.type(screen.getByLabelText(/^Email/), "rider@example.com");

    queueAuthError("auth/network-request-failed");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(
      await screen.findAllByText(/Network unavailable/i)
    ).not.toHaveLength(0);
  });

  it("goes back to sign in without sending anything", async () => {
    const { user } = renderWithProviders(<Login />, { route: "/login" });

    await openReset(user);
    await user.click(screen.getByRole("button", { name: "Back to sign in" }));

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send reset link" })
    ).not.toBeInTheDocument();
  });

  it("is reachable on a phone as well", async () => {
    setViewportWidth(375);

    const { user } = renderWithProviders(<Login />, { route: "/login" });

    await openReset(user);
    await user.type(screen.getByLabelText(/^Email/), "rider@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(
      await screen.findByText(/if an account exists for/i)
    ).toBeInTheDocument();
  });
});
