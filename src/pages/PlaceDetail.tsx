import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ExternalLink, MapPin, Phone } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlaceGlyph from "@/components/PlaceGlyph";
import { useAnnounce } from "@/components/a11y/LiveAnnouncer";
import { useTranslation } from "@/contexts/LocaleContext";
import { setPageDescription } from "@/lib/page-meta";
import { findPlace, gettingThereFor } from "@/domain/places";
import { getNetworkRoute } from "@/domain/transit/routes";

const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="py-3 border-b border-border last:border-b-0">
    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd className="mt-1 text-sm text-foreground">{children}</dd>
  </div>
);

const PlaceDetail = () => {
  const { placeId } = useParams();
  const place = placeId ? findPlace(placeId) : null;
  const announce = useAnnounce();
  const { t } = useTranslation();

  /*
    This page owns its own title and description.

    `RouteChangeHandler` keys its metadata off an exact pathname, and it sits
    in the eager bundle - resolving a place name there would have dragged the
    whole place dataset into the entry chunk for every visitor, including the
    ones who never open this page. It skips this route deliberately, so there
    is exactly one writer and no ordering race between them.
  */
  useEffect(() => {
    const title = place ? place.name : "Place not found";

    document.title = `${title} · BRT Bus Service`;
    setPageDescription(
      place
        ? `${place.description} Nearest BRT stop: ${place.nearestStop}.`
        : undefined
    );
    announce(
      t("route.loaded", {
        page: place ? place.name : t("page.placeNotFound"),
      })
    );
  }, [place, announce, t]);

  if (!place) {
    return (
      <div className="min-h-screen bg-background">
        <Header />

        <main id="main-content" tabIndex={-1} className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold text-foreground">
              {t("place.notFound.title")}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {t("place.notFound.body")}
            </p>
            <Link
              to="/nearby"
              className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-medium touch-target"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              {t("place.back")}
            </Link>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  const there = gettingThereFor(place);
  const routeNames = there.routeIds.map((id) => getNetworkRoute(id).name);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main-content" tabIndex={-1} className="py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/nearby"
            className="inline-flex items-center gap-1.5 text-sm text-primary font-medium touch-target"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {t("place.allNearby")}
          </Link>

          <div className="mt-4 rounded-2xl overflow-hidden border border-border bg-card">
            <div className="h-40 sm:h-56">
              <PlaceGlyph place={place} />
            </div>

            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                  {place.name}
                </h1>

                {place.official && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary whitespace-nowrap">
                    {t("place.operatorListing")}
                  </span>
                )}
              </div>

              <span className="inline-block mt-3 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                {place.category}
              </span>

              <p className="mt-4 text-foreground leading-relaxed">
                {place.description}
              </p>
            </div>
          </div>

          <section
            aria-labelledby="getting-there-heading"
            className="mt-6 rounded-2xl border border-border bg-card p-6"
          >
            <h2
              id="getting-there-heading"
              className="text-lg font-bold text-foreground"
            >
              {t("place.gettingThere")}
            </h2>

            {/*
              Read from the stop registry and the timetable, never written as
              prose. Free-text directions rot the moment a service changes -
              the operator's own have already done so.
            */}
            <dl className="mt-2">
              <Row label={t("place.row.nearestStop")}>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
                  {there.stop}
                </span>

                {there.stopSource === "registry" && (
                  <span className="block mt-1 text-xs text-muted-foreground">
                    {t("place.registryStop")}
                  </span>
                )}
              </Row>

              <Row label={t("place.row.routes")}>
                {routeNames.length > 0
                  ? routeNames.join(", ")
                  : t("place.noRoutes")}
              </Row>

              <Row label={t("place.row.service")}>
                {there.scheduled
                  ? t("place.scheduled")
                  : t("place.unserved")}
              </Row>

              {place.openingHours && (
                <Row label={t("place.row.hours")}>{place.openingHours}</Row>
              )}

              {place.contact && (
                <Row label={t("place.row.phone")}>
                  <a
                    href={`tel:${place.contact.replace(/[^\d+]/g, "")}`}
                    className="inline-flex items-center gap-1.5 text-primary underline underline-offset-2"
                  >
                    <Phone className="w-4 h-4" aria-hidden="true" />
                    {place.contact}
                  </a>
                </Row>
              )}

              {place.website && (
                <Row label={t("place.row.website")}>
                  <a
                    href={place.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 text-primary underline underline-offset-2 break-all"
                  >
                    {place.website.replace(/^https?:\/\//, "")}
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </Row>
              )}
            </dl>

            <div className="flex flex-wrap gap-2 mt-5">
              {there.scheduled && (
                <Link
                  to={`/plan?to=${encodeURIComponent(place.nearestStop)}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-transform duration-state hover:-translate-y-0.5 touch-target"
                >
                  {t("nearby.planJourney")}
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              )}

              {there.routeIds[0] && (
                <Link
                  to={`/routes?route=${there.routeIds[0]}`}
                  className="px-4 py-2 rounded-xl border border-border text-foreground text-sm font-medium transition-colors duration-state hover:bg-secondary touch-target"
                >
                  {t("nearby.route")}
                </Link>
              )}

              <Link
                to="/fares"
                className="px-4 py-2 rounded-xl border border-border text-foreground text-sm font-medium transition-colors duration-state hover:bg-secondary touch-target"
              >
                {t("nearby.fare")}
              </Link>
            </div>
          </section>

          {/*
            Where the facts came from, and how far they can be trusted. This is
            the section the whole dataset exists to be able to show: a place
            with a bad coordinate is labelled rather than quietly corrected.
          */}
          <section
            aria-labelledby="data-heading"
            className="mt-6 rounded-2xl border border-border bg-card p-6"
          >
            <h2 id="data-heading" className="text-lg font-bold text-foreground">
              {t("place.about")}
            </h2>

            <dl className="mt-2">
              <Row label={t("place.row.location")}>
                {place.coordinateStatus === "disputed" ? (
                  <>
                    <span className="font-medium">
                      {t("place.noMap")}
                    </span>{" "}
                    {place.coordinateNote}
                  </>
                ) : place.coordinates ? (
                  <>
                    {t("place.uncheckedLead")}{" "}
                    <span className="font-medium">
                      {t("place.uncheckedEmphasis")}
                    </span>
                    {t("place.uncheckedRest")}
                  </>
                ) : (
                  t("place.noCoordinate")
                )}
              </Row>

              <Row label={t("place.row.source")}>{place.source}</Row>
              <Row label={t("place.row.lastChecked")}>{place.lastVerified}</Row>
            </dl>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PlaceDetail;
