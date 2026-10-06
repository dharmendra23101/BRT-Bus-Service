import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RouteCard from "@/components/RouteCard";
import heroBus from "@/assets/hero-brts.webp";
import { Clock, Compass, MapPin, Search, Shield, Zap } from "lucide-react";
import { getAllTrips, getTripStops, type Trip } from "@/domain/transit/schedule";
import { serviceOn, serviceMinutesOf, SERVICE_LABELS } from "@/domain/transit/calendar";
import { tripTimings } from "@/domain/transit/departures";
import { useNow } from "@/hooks/use-now";
import JourneyOutlook from "@/components/JourneyOutlook";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTranslation } from "@/contexts/LocaleContext";
import type { TranslationKey } from "@/domain/i18n/strings";
import type { LucideIcon } from "lucide-react";

/*
  Keys, not sentences. This array is module-level, so a language chosen after
  it was evaluated would never reach it - the lookup has to happen at render.
*/
const rotatingKeys = [
  "home.headline.1",
  "home.headline.2",
  "home.headline.3",
  "home.headline.4",
] as const satisfies readonly TranslationKey[];

/** "A, B, C, … Z" - enough to convey the corridor without filling the card. */
const summariseStops = (trip: Trip): string => {
  const stops = getTripStops(trip);
  const last = stops[stops.length - 1];

  if (stops.length <= 5) return stops.join(", ");

  return `${stops.slice(0, 4).join(", ")}, … ${last}`;
};

/*
  Each of these is checkable somewhere else on the site.

  The first card previously promised "accurate arrival predictions", which the
  app deliberately does not make - P0-14 removed the ETA maths outright because
  the function grew as a bus got closer. The third vouched for the safety and
  maintenance of buses we neither run nor inspect. Neither belonged on the page
  a first-time passenger reads first.
*/
const features = [
  {
    icon: Clock,
    titleKey: "home.feature.timetable.title",
    bodyKey: "home.feature.timetable.body",
  },
  {
    icon: MapPin,
    titleKey: "home.feature.live.title",
    bodyKey: "home.feature.live.body",
  },
  {
    icon: Shield,
    titleKey: "home.feature.fares.title",
    bodyKey: "home.feature.fares.body",
  },
  {
    icon: Zap,
    titleKey: "home.feature.plan.title",
    bodyKey: "home.feature.plan.body",
  },
] as const satisfies readonly {
  icon: LucideIcon;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}[];

const Home = () => {
  const { t } = useTranslation();

  const [textIndex, setTextIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const now = useNow(60_000);

  /*
    Today's service, and only what has not left yet.

    This was `getTrips("weekday").slice(0, 5)` evaluated once at import: a
    visitor on a Sunday evening was shown Monday's first five departures, all
    of them hours in the past, presented as "available buses". The service day
    comes from the IST calendar and the cut is made against the clock, so the
    list is about the moment somebody is reading it.
  */
  const service = serviceOn(now);

  const featured = useMemo(() => {
    const trips = getAllTrips(service);
    const timings = tripTimings(trips, serviceMinutesOf(now));

    return trips.filter((_, index) => timings[index] !== "departed").slice(0, 6);
  }, [service, now]);

  /*
    The headline cycles for as long as the page is open, which is exactly the
    auto-starting motion WCAG 2.2.2 is about. Under a reduced-motion
    preference it settles on the first line and stops rather than animating
    indefinitely - the stylesheet cannot help here, because the movement is a
    timer swapping content, not a CSS animation.
  */
  useEffect(() => {
    if (reducedMotion) return;

    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % rotatingKeys.length);
      setAnimKey((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, [reducedMotion]);

  return (
    <div className="min-h-screen bg-background">

      <Header />

      <main id="main-content" tabIndex={-1}>

      <section className="relative w-full h-[420px] md:h-[520px] lg:h-[620px] overflow-hidden">

        {/*
          The largest-contentful-paint element. Intrinsic dimensions are
          declared so the browser reserves the space before the image arrives
          (no layout shift), and the priority hint marks it as the one image
          worth competing for bandwidth.

          Spelled lowercase because React 18 does not recognise the camelCase
          form: it drops the attribute before it reaches the DOM and warns on
          every render, so the hint the comment describes never applied.
        */}
        <img
          src={heroBus}
          alt={t("home.busAlt")}
          width={1080}
          height={572}
          {...{ fetchpriority: "high" }}
          decoding="async"
          className="w-full h-full object-cover scale-[1.03]"
        />

        {/*
          The scrim is set by contrast, not by taste.

          A photo hero has no fixed background colour, so the overlay has to
          hold the worst case: a white frame behind it. At the previous
          `primary/70` centre, the subtitle measured 2.92:1 against that - a
          fail whatever the photograph happens to be. The deep tone at /75
          reaches 4.59:1 and still leaves a quarter of the image showing.
        */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-deep/80 via-primary-deep/75 to-primary-deep/90 flex items-center justify-center">

          <div className="text-center px-4 max-w-4xl">

            {/*
              The page's h1. The rotating strapline is decorative, so it is
              not placed in a live region - re-announcing it every three
              seconds would make the page unusable with a screen reader.
            */}
            <h1
              key={animKey}
              className="text-white text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight drop-shadow-lg animate-fade-in-up"
            >
              {t(rotatingKeys[textIndex]!)}
            </h1>

            <p className="text-white/90 text-lg md:text-xl mt-6 max-w-2xl mx-auto leading-relaxed">
              {t("home.strapline")}
            </p>

            {/*
              Navigates rather than searching in place. The search domain
              reaches the whole place dataset, and this is the landing page -
              keeping the lookup on its own lazy route means a visitor who
              never searches never downloads it.
            */}
            <form
              onSubmit={(event) => {
                event.preventDefault();

                const term = search.trim();
                if (term) navigate(`/search?q=${encodeURIComponent(term)}`);
              }}
              role="search"
              className="mt-8 flex gap-2 max-w-xl mx-auto"
            >
              <label htmlFor="home-search" className="sr-only">
                {t("home.search.label")}
              </label>
              <input
                id="home-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("home.search.placeholder")}
                className="flex-1 bg-white rounded-xl px-4 py-3 border-2 border-white/40 focus:border-white transition-colors"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-white text-primary-deep rounded-xl hover:bg-white/90 transition-colors font-semibold flex items-center gap-2"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                {/*
                  Visually hidden rather than `hidden`, which is `display:none`
                  and removes it from the accessibility tree too - with the icon
                  already aria-hidden, that left the button with no accessible
                  name at all below 640px. jsdom applies no CSS, so axe could
                  not see it; a real browser at 320px could.
                */}
                <span className="sr-only sm:not-sr-only">Search</span>
              </button>
            </form>

          </div>

        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent"></div>

      </section>

      <section className="py-20 px-4" aria-labelledby="features-heading">

        <h2 id="features-heading" className="sr-only">
          {t("home.why")}
        </h2>

        <div className="max-w-7xl mx-auto">

          <div className="relative rounded-[32px] bg-surface-raised px-6 md:px-12 py-14 shadow-[0_30px_90px_rgba(0,0,0,0.06)]">

            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl opacity-70"></div>

            <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="group rounded-[22px] p-[1px] bg-gradient-to-br from-primary/25 via-primary/15 to-transparent transition-transform duration-state hover:-translate-y-[6px]"
                >
                  <div className="rounded-[22px] bg-white/95 backdrop-blur-xl p-6 border border-border shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-shadow duration-state group-hover:shadow-[0_25px_70px_rgba(0,0,0,0.08)]">

                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>

                    <h3 className="text-[17px] font-semibold text-primary mb-2">
                      {t(feature.titleKey)}
                    </h3>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(feature.bodyKey)}
                    </p>

                  </div>
                </div>
              ))}

            </div>

          </div>

        </div>

      </section>

      <section className="pb-12 px-4" aria-labelledby="explore-heading">

        <div className="max-w-7xl mx-auto">

          <div className="relative rounded-[30px] bg-surface-raised px-6 md:px-12 py-10 shadow-[0_25px_80px_rgba(0,0,0,0.06)] flex flex-col md:flex-row md:items-center md:justify-between gap-6">

            <div>
              <h2 id="explore-heading" className="text-[26px] md:text-[32px] font-semibold text-primary tracking-tight">
                {t("home.places.title")}
              </h2>

              <p className="text-muted-foreground text-[15px] md:text-[16px] mt-3 max-w-2xl">
                {t("home.places.short")}
              </p>
            </div>

            <Link
              to="/nearby"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-primary text-white font-semibold whitespace-nowrap transition-[transform,box-shadow] duration-state hover:-translate-y-[2px] hover:shadow-[0_15px_35px_hsl(var(--primary)/0.35)]"
            >
              <Compass className="w-5 h-5" aria-hidden="true" />
              {t("home.places.cta")}
            </Link>

          </div>

        </div>

      </section>

      <JourneyOutlook />

      <section className="pb-24 px-4" aria-labelledby="next-buses-heading">

        <div className="max-w-7xl mx-auto">

          <div className="text-center mb-12">
            <h2
              id="next-buses-heading"
              className="text-[34px] md:text-[40px] font-semibold text-primary tracking-tight"
            >
              {t("home.next.title")}
            </h2>

            <p className="text-muted-foreground text-[15px] md:text-[16px] mt-3">
              {SERVICE_LABELS[service]}, from the published timetable.
            </p>
          </div>

          <div className="relative rounded-[30px] bg-surface-raised px-6 md:px-12 py-12 shadow-[0_25px_80px_rgba(0,0,0,0.06)]">

            <div className="absolute inset-0 rounded-[30px] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-3xl opacity-70"></div>

            {featured.length === 0 ? (
              <div className="relative text-center">
                <p className="text-foreground font-semibold">
                  {t("home.next.finished")}
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                  <Link
                    to="/timetable"
                    className="text-primary font-medium underline underline-offset-2"
                  >
                    {t("home.next.checkTimetable")}
                  </Link>{" "}
                  {t("home.next.forWhenItStarts")}
                </p>
              </div>
            ) : (
              <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featured.map((trip) => (
                  <div
                    key={trip.id}
                    className="group transition-transform duration-state hover:-translate-y-[5px]"
                  >
                    <RouteCard
                      title={`${trip.calls[0]?.time} · Route ${trip.routeId}`}
                      stops={summariseStops(trip)}
                    />
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      </section>

      </main>

      <Footer />

    </div>
  );
};

export default Home;