import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import {
  OPERATOR,
  OPERATOR_SOURCE,
  SERVICE_FACTS,
  INFRASTRUCTURE_FACTS,
  PUBLISHED_STOPS,
  type OperatorFact,
} from "@/domain/transit/operator";
import { STOPS } from "@/domain/transit/stops";
import { TIMETABLE_SOURCE } from "@/domain/transit/timetable";
import { DATE_LOCALES } from "@/domain/i18n/strings";
import { formatDate } from "@/domain/time";
import { SCHEDULED_STOPS } from "@/domain/transit/schedule";
import { ROUTE_IDS, NETWORK_ROUTE_IDS, INTERCHANGES } from "@/domain/transit/routes";
import { FARE_TABLE } from "@/domain/transit/fares";
import {
  DEFAULT_FRESHNESS,
  PASSENGER_VISIBLE,
  STATE_LABELS,
  STATE_DESCRIPTIONS,
} from "@/domain/fleet/state";
import { activePaymentProvider } from "@/services/payment/demoProvider";
import { useTranslation } from "@/contexts/LocaleContext";

/*
  Read from the fare chart rather than typed, for the same reason the fares
  page stopped hardcoding prices: a range quoted here would otherwise go on
  claiming a fare the chart no longer lists.
*/
const publishedFares = STOPS.flatMap((from) =>
  STOPS.map((to) => FARE_TABLE[from][to]).filter(
    (fare): fare is number => typeof fare === "number" && fare > 0
  )
);

const lowestFare = Math.min(...publishedFares);
const highestFare = Math.max(...publishedFares);

const staleMinutes = Math.round(DEFAULT_FRESHNESS.staleMs / 60_000);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="bg-white rounded-2xl p-6 md:p-8 shadow-lg">
    <h2 className="text-2xl font-bold text-primary-deep mb-6">{title}</h2>
    <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
      {children}
    </div>
  </section>
);

const FactList = ({ facts }: { facts: readonly OperatorFact[] }) => (
  <dl className="divide-y divide-border">
    {facts.map(({ label, value, caveat }) => (
      <div key={label} className="py-3 sm:flex sm:justify-between sm:gap-6">
        <dt className="font-medium text-gray-900">{label}</dt>
        <dd className="sm:text-right sm:max-w-md">
          {value}
          {caveat ? (
            <span className="block text-xs text-gray-500 mt-1">{caveat}</span>
          ) : null}
        </dd>
      </div>
    ))}
  </dl>
);

const About = () => {
  const { t, locale } = useTranslation();
  const payments = activePaymentProvider();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-white">
      <Header />

      <main id="main-content" tabIndex={-1} className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary-deep mb-3">
              {t("about.title")}
            </h1>
            <p className="text-gray-600">{t("about.intro")}</p>
          </div>

          <div className="space-y-8">
            <Section title={t("about.brt.heading")}>
              <p>{t("about.brt.1")}</p>
              <p>{t("about.brt.2")}</p>
            </Section>

            <Section title={t("about.service.heading")}>
              <p>
                {t("about.service.intro", {
                  operator: OPERATOR.name,
                  abbreviation: OPERATOR.abbreviation,
                })}
              </p>

              <FactList facts={SERVICE_FACTS} />

              <h3 className="font-semibold text-gray-900 pt-2">
                {t("about.service.infrastructure")}
              </h3>
              <FactList facts={INFRASTRUCTURE_FACTS} />

              <p className="text-xs text-gray-500 border-t border-border pt-4">
                {t("about.service.source", {
                  publication: OPERATOR_SOURCE.publication,
                  url: OPERATOR_SOURCE.url,
                  retrieved: OPERATOR_SOURCE.retrievedOn,
                  unreachable: OPERATOR_SOURCE.unreachableSince,
                  abbreviation: OPERATOR.abbreviation,
                })}
              </p>
            </Section>

            <Section title={t("about.timetable.heading")}>
              <p>
                {t("about.timetable.body", {
                  title: TIMETABLE_SOURCE.title,
                  publisher: TIMETABLE_SOURCE.publisher,
                  document: TIMETABLE_SOURCE.document,
                  date: formatDate(
                    TIMETABLE_SOURCE.extractedOn,
                    DATE_LOCALES[locale]
                  ),
                })}
              </p>
              <p>{t("about.timetable.stale")}</p>
            </Section>

            <Section title={t("about.stops.heading")}>
              <p>{t("about.stops.intro")}</p>

              <FactList facts={PUBLISHED_STOPS} />

              <p>
                {t("about.stops.ours", {
                  total: STOPS.length,
                  scheduled: SCHEDULED_STOPS.size,
                })}
              </p>
              <p>{t("about.stops.unserved")}</p>
            </Section>

            <Section title={t("about.network.heading")}>
              <p>
                {t("about.network.body", {
                  routes: NETWORK_ROUTE_IDS.length,
                  interchanges: INTERCHANGES.length,
                  workings: ROUTE_IDS.length,
                })}
              </p>
              <p>
                <Link to="/routes" className="text-primary font-medium underline">
                  {t("about.network.link")}
                </Link>
                {t("about.sentenceEnd")}
              </p>
            </Section>

            <Section title={t("about.fares.heading")}>
              <p>
                {t("about.fares.body", {
                  lowest: lowestFare,
                  highest: highestFare,
                })}
              </p>
              <p>
                <Link to="/fares" className="text-primary font-medium underline">
                  {t("about.fares.link")}
                </Link>
                {t("about.sentenceEnd")}
              </p>
            </Section>

            <Section title={t("about.ride.heading")}>
              <p>
                {t("about.ride.lead")}{" "}
                <Link to="/plan" className="text-primary font-medium underline">
                  {t("about.ride.plan")}
                </Link>
                {t("about.ride.separator")}
                <Link
                  to="/timetable"
                  className="text-primary font-medium underline"
                >
                  {t("about.ride.timetable")}
                </Link>
                {t("about.ride.or")}
                <Link to="/nearby" className="text-primary font-medium underline">
                  {t("about.ride.nearby")}
                </Link>
                {t("about.sentenceEnd")}
              </p>
            </Section>

            <Section title={t("about.live.heading")}>
              <p>{t("about.live.1")}</p>
              <p>{t("about.live.2")}</p>
              <dl className="divide-y divide-border">
                {PASSENGER_VISIBLE.map((state) => (
                  <div key={state} className="py-3">
                    <dt className="font-medium text-gray-900">
                      {t(STATE_LABELS[state])}
                    </dt>
                    <dd>{t(STATE_DESCRIPTIONS[state])}</dd>
                  </div>
                ))}
              </dl>
              <p>{t("about.live.3", { minutes: staleMinutes })}</p>
            </Section>

            <Section title={t("about.tickets.heading")}>
              <p>
                {t("about.tickets.stored")}{" "}
                {payments.settlesRealMoney
                  ? t("about.tickets.paid", { provider: payments.label })
                  : t("about.tickets.demo")}
              </p>
              <p>{t("about.tickets.offline")}</p>
            </Section>

            <Section title={t("about.updates.heading")}>
              <p>{t("about.updates.body")}</p>
            </Section>

            <Section title={t("about.a11y.heading")}>
              <p>{t("about.a11y.1")}</p>
              <p>
                {t("about.a11y.2")}{" "}
                <Link to="/contact" className="text-primary font-medium underline">
                  {t("about.a11y.contactLink")}
                </Link>
                {t("about.sentenceEnd")}
              </p>
            </Section>

            <Section title={t("about.next.heading")}>
              <p>{t("about.next.intro")}</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>{t("about.next.gtfs")}</li>
              </ul>
            </Section>

            <Section title={t("about.who.heading")}>
              <p>
                {t("about.who.body", { abbreviation: OPERATOR.abbreviation })}
              </p>
              <p>
                <Link to="/contact" className="text-primary font-medium underline">
                  {t("about.who.link")}
                </Link>
                {t("about.sentenceEnd")}
              </p>
            </Section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
