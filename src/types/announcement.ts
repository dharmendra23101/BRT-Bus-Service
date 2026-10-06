import type { TimestampLike } from "./user";
import type { TranslationKey } from "@/domain/i18n/en";
import type { InformedEntity } from "@/domain/alerts/targeting";

export const ANNOUNCEMENT_SEVERITIES = ["INFO", "WARNING", "CRITICAL"] as const;

export type AnnouncementSeverity = (typeof ANNOUNCEMENT_SEVERITIES)[number];

/** How each severity is described to a passenger. */
export const SEVERITY_LABELS: Record<AnnouncementSeverity, TranslationKey> = {
  INFO: "alerts.severity.info",
  WARNING: "alerts.severity.warning",
  CRITICAL: "alerts.severity.critical",
};

/**
 * Something the operator wants passengers to know.
 *
 * Every field is authored by an administrator. Nothing here is derived or
 * generated, because a notice the operator did not write is a notice no
 * passenger should be shown.
 */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  /** Retired notices stay readable to an administrator but leave the site. */
  active: boolean;
  /**
   * What this notice is about, absent when it concerns the whole network.
   *
   * Optional because every notice written before targeting existed has none,
   * and those must keep reaching passengers rather than being read as
   * affecting nothing.
   */
  informedEntities?: InformedEntity[];
  /** Milliseconds since the epoch; an absent bound is open. */
  startsAt?: number;
  endsAt?: number;
  createdAt?: TimestampLike;
}

export interface AnnouncementDraft {
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  informedEntities?: InformedEntity[];
  startsAt?: number;
  endsAt?: number;
}
