import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAnnounce } from "@/components/a11y/LiveAnnouncer";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LocaleContext";
import { useTickets } from "@/contexts/TicketContext";
import { PAYMENT_FAILURE_MESSAGES } from "@/domain/payment/types";
import type { JourneySelection, PaymentStatus } from "@/domain/ticket/types";
import type { TranslationKey } from "@/domain/i18n/en";
import { confirmPayment } from "@/domain/ticket/factory";
import { activePaymentProvider } from "@/services/payment/demoProvider";
import { BOOKING_FAILURE_MESSAGES } from "@/services/ticketService";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  /** The journey being paid for. */
  selection: JourneySelection;
  onSuccess: () => void;
}

/*
  Identifies the booking attempt rather than the click, so a double-tapped
  button and a retry after a failure both resolve to the same payment.
*/
const idempotencyKeyFor = (userId: string, selection: JourneySelection): string =>
  [
    userId,
    selection.route,
    selection.fromStop,
    selection.toStop,
    selection.departureTime,
  ].join("|");

const PaymentModal = ({ open, onClose, selection, onSuccess }: PaymentModalProps) => {
  const { user } = useAuth();
  const { validateBooking, issueTicket } = useTickets();
  const announce = useAnnounce();
  const { t } = useTranslation();

  const provider = activePaymentProvider();

  const [status, setStatus] = useState<PaymentStatus>("PENDING");
  const [error, setError] = useState<TranslationKey | "">("");
  const [warning, setWarning] = useState<TranslationKey | "">("");

  const successRef = useRef<HTMLButtonElement>(null);

  const { fromStop, toStop, fare, departureTime, arrivalTime } = selection;

  /** A payment in flight must not be interrupted by Escape or a click-away. */
  const isProcessing = status === "PROCESSING";

  useEffect(() => {
    if (open) {
      setStatus("PENDING");
      setError("");
      setWarning("");
    }
  }, [open]);

  /**
   * Moves focus onto the confirmation once payment succeeds.
   *
   * Without this a keyboard user is left on a button that no longer exists
   * and focus falls back to the document body.
   */
  useEffect(() => {
    if (status === "SUCCESS") successRef.current?.focus();
  }, [status]);

  const handlePay = async () => {
    if (!user) {
      setError("payment.error.signedOut");
      setStatus("FAILED");
      announce(t("payment.announce.signedOut"), "assertive");
      return;
    }

    /*
      Every booking rule is applied before the provider is called. Running
      them afterwards is what allowed a passenger to be charged and then
      refused a ticket.
    */
    const validation = validateBooking({
      ...selection,
      userId: user.uid,
      userEmail: user.email ?? "",
    });

    if (!validation.ok) {
      const key = BOOKING_FAILURE_MESSAGES[validation.reason];
      setError(key);
      setStatus("FAILED");
      announce(
        t("payment.announce.bookingFailed", { reason: t(key) }),
        "assertive"
      );
      return;
    }

    setStatus("PROCESSING");
    announce(t("payment.announce.processing"));

    try {
      const outcome = await provider.pay(
        fare,
        idempotencyKeyFor(user.uid, selection)
      );

      if (!outcome.ok) {
        const key = PAYMENT_FAILURE_MESSAGES[outcome.reason];
        setError(key);
        setStatus("FAILED");
        announce(
          t("payment.announce.paymentFailed", { reason: t(key) }),
          "assertive"
        );
        return;
      }

      // Past this point the passenger owns the ticket, so issuing cannot
      // refuse. A storage failure is reported without destroying it.
      //
      // The ticket is stamped with what the provider returned rather than
      // stored as built: until this line it says the payment is PENDING,
      // which is what it was.
      const issued = await issueTicket(
        confirmPayment(validation.ticket, outcome.intent)
      );

      setStatus("SUCCESS");
      setWarning(issued.persisted ? "" : "payment.success.notSaved");
      announce(
        t("payment.announce.success", { from: fromStop, to: toStop })
      );
    } catch (err) {
      console.error("Payment failed:", err);
      setError("payment.error.unknown");
      setStatus("FAILED");
      announce(t("payment.announce.retry"), "assertive");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isProcessing) onClose();
      }}
    >
      <DialogContent
        className="max-w-md rounded-2xl"
        hideClose={isProcessing}
        onEscapeKeyDown={(event) => {
          if (isProcessing) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isProcessing) event.preventDefault();
        }}
      >
        {status === "PENDING" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">{t("payment.title")}</DialogTitle>
              <DialogDescription>
                {t("payment.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="bg-secondary rounded-xl p-4">
              <p className="font-semibold">
                {fromStop} <span aria-hidden="true">→</span>
                <span className="sr-only">{t("payment.srTo")}</span> {toStop}
              </p>
              <p className="text-sm">
                {departureTime} <span aria-hidden="true">-</span>
                <span className="sr-only">{t("payment.srUntil")}</span> {arrivalTime}
              </p>
              <p className="text-2xl font-bold text-primary mt-2">₹{fare}/-</p>
            </div>

            {!provider.settlesRealMoney && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <ShieldAlert
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="font-semibold">{t("payment.noMoney.title")}</p>
                  <p className="text-sm mt-0.5">
                    {t("payment.noMoney.body")}
                  </p>
                </div>
              </div>
            )}

            <button type="button" onClick={handlePay} className="w-full brt-button touch-target">
              {provider.settlesRealMoney
                ? t("payment.pay", { fare })
                : t("payment.payDemo", { fare })}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-sm text-muted-foreground touch-target"
            >
              {t("action.cancel")}
            </button>
          </>
        )}

        {isProcessing && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">{t("payment.processing.title")}</DialogTitle>
              <DialogDescription>
                {t("payment.processing.description")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center py-8">
              <Loader2
                className="w-12 h-12 text-primary animate-spin mb-4"
                aria-hidden="true"
              />
              <p>{t("payment.processing.status")}</p>
            </div>
          </>
        )}

        {status === "SUCCESS" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">{t("payment.success.title")}</DialogTitle>
              <DialogDescription>
                {t("payment.success.description", { from: fromStop, to: toStop })}
              </DialogDescription>
            </DialogHeader>

            {!provider.settlesRealMoney && (
              <p className="text-sm text-muted-foreground text-center">
                {t("payment.success.demo")}
              </p>
            )}

            {warning && (
              <p role="status" className="text-sm text-amber-900 text-center">
                {t(warning)}
              </p>
            )}

            <div className="flex flex-col items-center py-6">
              <span className="text-4xl mb-3" aria-hidden="true">
                🎉
              </span>

              <button
                ref={successRef}
                type="button"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="brt-button touch-target"
              >
                {t("payment.viewTicket")}
              </button>
            </div>
          </>
        )}

        {status === "FAILED" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl text-destructive">
                {t("payment.failed.title")}
              </DialogTitle>
              <DialogDescription>
                {error ? t(error) : t("payment.failed.generic")}
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-3 justify-center py-4">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-border text-foreground font-medium transition-colors duration-state hover:bg-secondary touch-target"
              >
                {t("action.close")}
              </button>

              <button
                type="button"
                onClick={() => setStatus("PENDING")}
                className="brt-button touch-target"
              >
                {t("state.retry")}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
