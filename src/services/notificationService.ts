/**
 * Asking the platform for permission to alert.
 *
 * This is all that is left here. The rules that decide *whether* a passenger
 * should be interrupted moved to `@/domain/alerts/arrival`, because they are
 * the part that transfers to another platform unchanged - and they could not
 * live in this file, which touches `window` and `Notification` and therefore
 * loads nowhere except a browser.
 *
 * Asking a platform for permission is exactly the part that does not transfer,
 * so it stays.
 */

/**
 * Asks the browser to allow arrival alerts.
 *
 * Called when a passenger switches alerts on, rather than on page load, so the
 * prompt follows a deliberate choice instead of interrupting every visitor.
 * A refusal is not an error: the in-app popup still works without it.
 */
export const requestAlertPermission = async (): Promise<void> => {
  if (!("Notification" in window) || Notification.permission !== "default") return;

  try {
    await Notification.requestPermission();
  } catch {
    return;
  }
};
