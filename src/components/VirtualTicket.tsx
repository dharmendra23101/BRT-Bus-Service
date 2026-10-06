import { useEffect, useId, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Check, Copy, Download } from "lucide-react";
import { POLLING, QR_CONFIG } from "@/constants/config";
import { useAnnounce } from "@/components/a11y/LiveAnnouncer";
import { STATUS_LABELS, isLiveStatus } from "@/domain/ticket/status";
import { BRAND_NAME } from "@/constants/config";
import { useTranslation } from "@/contexts/LocaleContext";
import type { Ticket, TicketStatus } from "@/domain/ticket/types";
import { formatCountdown } from "@/domain/time";

interface VirtualTicketProps {
  ticket: Ticket;
  onCancel?: (ticketId: string) => void;
}

/** Presentation only - the labels themselves come from the domain. */
const STATUS_STYLES: Record<TicketStatus, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-100",
  ACTIVE: "bg-green-500/20 text-green-200",
  BOARDING_SOON: "bg-amber-500/20 text-amber-100",
  IN_TRANSIT: "bg-blue-500/20 text-blue-100",
  COMPLETED: "bg-slate-500/20 text-slate-100",
  CANCELLED: "bg-red-500/20 text-red-200",
};

/**
 * Minutes at which the remaining validity is spoken.
 *
 * The countdown re-renders every second; putting it in a live region would
 * make a screen reader read a number once per second and drown out
 * everything else. Announcing at a few thresholds conveys the same urgency
 * without hijacking the user.
 */
const ANNOUNCE_AT_MINUTES = [30, 10, 5, 1];

const VirtualTicket = ({ ticket, onCancel }: VirtualTicketProps) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState("");
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const announcedRef = useRef<Set<number>>(new Set());
  const announce = useAnnounce();

  const headingId = useId();

  const live = isLiveStatus(ticket.status);

  useEffect(() => {
    if (!live) {
      setTimeLeft("");
      return;
    }

    const update = () => {
      const remaining = new Date(ticket.expiresAt).getTime() - Date.now();

      setTimeLeft(remaining <= 0 ? t("ticket.expired") : formatCountdown(remaining));

      const minutes = Math.floor(remaining / 60_000);
      const threshold = ANNOUNCE_AT_MINUTES.find((mark) => minutes === mark);

      if (threshold !== undefined && !announcedRef.current.has(threshold)) {
        announcedRef.current.add(threshold);
        announce(
          t(
            threshold === 1
              ? "ticket.announce.validForOne"
              : "ticket.announce.validForMany",
            { minutes: threshold }
          )
        );
      }
    };

    update();
    const interval = setInterval(update, POLLING.TICKET_COUNTDOWN_MS);

    return () => clearInterval(interval);
  }, [ticket.expiresAt, live, announce, t]);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), 2000);

    return () => clearTimeout(timer);
  }, [copied]);

  const copyBookingId = async () => {
    try {
      await navigator.clipboard.writeText(ticket.ticketId);
      setCopied(true);
      announce(t("ticket.announce.copied"));
    } catch (error) {
      console.error("Failed to copy booking id:", error);
      announce(t("ticket.announce.copyFailed"), "assertive");
    }
  };

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector("canvas");

    if (!canvas) {
      announce(t("ticket.announce.qrFailed"), "assertive");
      return;
    }

    const link = document.createElement("a");
    link.download = `${ticket.ticketId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    announce(t("ticket.announce.qrDownloaded"));
  };

  return (
    <article className="ticket-card animate-fade-in" aria-labelledby={headingId}>
      <div className="ticket-header">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">
              {BRAND_NAME}
            </p>
            <h3 id={headingId} className="text-lg font-bold tracking-tight">
              {t("ticket.heading", {
                route: ticket.route,
                from: ticket.fromStop,
                to: ticket.toStop,
              })}
            </h3>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
              STATUS_STYLES[ticket.status]
            }`}
          >
            <span className="sr-only">{t("ticket.statusPrefix")}</span>
            {t(STATUS_LABELS[ticket.status])}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {t("journey.from")}
            </p>
            <p className="font-bold text-foreground text-lg">{ticket.fromStop}</p>
          </div>
          <div className="flex items-center px-3 pt-2" aria-hidden="true">
            <span className="text-primary text-xl">→</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {t("journey.to")}
            </p>
            <p className="font-bold text-foreground text-lg">{ticket.toStop}</p>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-3 mb-5">
          <div>
            <dt className="text-xs text-muted-foreground">{t("journey.departure")}</dt>
            <dd className="font-semibold text-foreground text-sm">
              {ticket.departureTime}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("journey.arrival")}</dt>
            <dd className="font-semibold text-foreground text-sm">
              {ticket.arrivalTime}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("ticket.farePaid")}</dt>
            <dd className="font-bold text-primary text-sm">₹{ticket.fare}/-</dd>
          </div>
        </dl>

        {live && (
          <div className="bg-secondary rounded-xl p-3 mb-5 text-center">
            <p className="text-xs text-muted-foreground mb-1" id={`${headingId}-valid`}>
              {t("ticket.validFor")}
            </p>
            {/*
              role="timer" with the default aria-live="off": readable on
              demand, never announced once per second.
            */}
            <p
              role="timer"
              aria-labelledby={`${headingId}-valid`}
              className="text-xl font-bold text-primary tabular-nums tracking-wider"
            >
              {timeLeft}
            </p>
          </div>
        )}

        <div className="flex flex-col items-center">
          <div
            ref={qrRef}
            role="img"
            aria-label={
              live
                ? t("ticket.qrLabel", { id: ticket.ticketId })
                : t("ticket.qrLabelExpired", { id: ticket.ticketId })
            }
            className={`bg-white p-3 rounded-xl border border-border mb-2 ${
              live ? "" : "opacity-40 grayscale"
            }`}
          >
            <QRCodeCanvas
              value={ticket.qrData}
              size={QR_CONFIG.TICKET_SIZE}
              level={QR_CONFIG.ERROR_CORRECTION}
            />
          </div>

          <button
            type="button"
            onClick={copyBookingId}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] text-muted-foreground font-mono hover:text-primary hover:bg-secondary transition-colors"
          >
            {copied ? (
              <Check className="w-3 h-3" aria-hidden="true" />
            ) : (
              <Copy className="w-3 h-3" aria-hidden="true" />
            )}
            <span aria-hidden="true">{ticket.ticketId}</span>
            <span className="sr-only">
              {copied
                ? t("ticket.copied")
                : t("ticket.copy", { id: ticket.ticketId })}
            </span>
          </button>

          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <button
              type="button"
              onClick={downloadQr}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground transition-colors duration-state hover:bg-secondary touch-target"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              {t("ticket.saveQr")}
            </button>

            {live && onCancel && (
              <button
                type="button"
                onClick={() => onCancel(ticket.ticketId)}
                className="px-3 py-2 rounded-lg border border-destructive/40 text-xs font-medium text-destructive transition-colors duration-state hover:bg-destructive/10 touch-target"
              >
                {t("ticket.cancel")}
                <span className="sr-only">
                  {t("ticket.cancelFor", {
                    from: ticket.fromStop,
                    to: ticket.toStop,
                  })}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default VirtualTicket;
