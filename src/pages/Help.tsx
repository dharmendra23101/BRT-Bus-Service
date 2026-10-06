import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { ARRIVAL_RULES, TICKET_RULES } from "@/constants/config";
import { ROUTE_IDS, getRoute } from "@/domain/transit/routes";
import { STOPS } from "@/domain/transit/stops";
import { SCHEDULED_STOPS } from "@/domain/transit/schedule";
import { STATUS_LABELS } from "@/domain/ticket/status";
import { BOOKING_FAILURE_MESSAGES } from "@/services/ticketService";
import { useTranslation } from "@/contexts/LocaleContext";
import { DEFAULT_FRESHNESS } from "@/domain/fleet/state";

/*
  Read from the freshness ladder rather than typed as prose, so the page
  cannot claim a window the map no longer applies. It was a single 120-second
  cut-off; a bus is now classified across five states, and the number a
  passenger cares about is the one past which we stop showing it at all.
*/
const staleMinutes = Math.round(DEFAULT_FRESHNESS.staleMs / 60_000);

const Answer = ({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) => (
  <div className="border-t border-border pt-5">
    <h3 className="font-semibold text-gray-900 mb-2">{question}</h3>
    <div className="text-gray-600 text-sm leading-relaxed space-y-2">{children}</div>
  </div>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="bg-white rounded-2xl p-6 md:p-8 shadow-lg">
    <h2 className="text-2xl font-bold text-primary-deep mb-6">{title}</h2>
    <div className="space-y-5">{children}</div>
  </section>
);

const Help = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-white">
      <Header />

      <main id="main-content" tabIndex={-1} className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary-deep mb-3">
              {t("help.title")}
            </h1>
            <p className="text-gray-600">{t("help.intro")}</p>
          </div>

          <div className="space-y-8">
            <Section title={t("help.plan.heading")}>
              <Answer question={t("help.plan.routes.q")}>
                <p>
                  {t("help.plan.routes.a", {
                    count: ROUTE_IDS.length,
                    names: ROUTE_IDS.map((id) => getRoute(id).name).join(" and "),
                    express: getRoute("102").name,
                    local: getRoute("101").name,
                  })}
                </p>
                <p>
                  <Link to="/routes" className="text-primary font-medium underline">
                    {t("help.plan.routes.link")}
                  </Link>
                  {t("about.sentenceEnd")}
                </p>
              </Answer>

              <Answer question={t("help.plan.noDepartures.q")}>
                <p>
                  {t("help.plan.noDepartures.a", {
                    scheduled: SCHEDULED_STOPS.size,
                    total: STOPS.length,
                  })}
                </p>
              </Answer>

              <Answer question={t("help.plan.times.q")}>
                <p>{t("help.plan.times.a")}</p>
              </Answer>

              <Answer question={t("help.plan.change.q")}>
                <p>{t("help.plan.change.a1")}</p>
                <p>{t("help.plan.change.a2")}</p>
              </Answer>
            </Section>

            <Section title={t("help.fares.heading")}>
              <Answer question={t("help.fares.calc.q")}>
                <p>{t("help.fares.calc.a")}</p>
                <p>
                  <Link to="/fares" className="text-primary font-medium underline">
                    {t("about.fares.link")}
                  </Link>
                  {t("about.sentenceEnd")}
                </p>
              </Answer>

              <Answer question={t("help.fares.unpriced.q")}>
                <p>{t("help.fares.unpriced.a")}</p>
              </Answer>
            </Section>

            <Section title={t("help.booking.heading")}>
              <Answer question={t("help.booking.refused.q")}>
                <p>{t("help.refusalsIntro")}</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{t(BOOKING_FAILURE_MESSAGES.NOT_AUTHENTICATED)}</li>
                  <li>{t(BOOKING_FAILURE_MESSAGES.ALREADY_DEPARTED)}</li>
                  <li>{t(BOOKING_FAILURE_MESSAGES.OVERLAPPING_TICKET)}</li>
                  <li>{t(BOOKING_FAILURE_MESSAGES.STORAGE_FAILED)}</li>
                </ul>
              </Answer>

              <Answer question={t("help.booking.two.q")}>
                <p>{t("help.booking.two.a")}</p>
              </Answer>
            </Section>

            <Section title={t("help.ticket.heading")}>
              <Answer question={t("help.ticket.states.q")}>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <span className="font-medium">{t(STATUS_LABELS.ACTIVE)}</span>{" "}
                    {t("help.state.active", {
                      minutes: TICKET_RULES.BOARDING_WINDOW_MINUTES,
                    })}
                  </li>
                  <li>
                    <span className="font-medium">
                      {t(STATUS_LABELS.BOARDING_SOON)}
                    </span>{" "}
                    {t("help.state.boardingSoon", {
                      minutes: TICKET_RULES.BOARDING_WINDOW_MINUTES,
                    })}
                  </li>
                  <li>
                    <span className="font-medium">{t(STATUS_LABELS.IN_TRANSIT)}</span>{" "}
                    {t("help.state.inTransit")}
                  </li>
                  <li>
                    <span className="font-medium">{t(STATUS_LABELS.COMPLETED)}</span>{" "}
                    {t("help.state.completed")}
                  </li>
                  <li>
                    <span className="font-medium">{t(STATUS_LABELS.CANCELLED)}</span>{" "}
                    {t("help.state.cancelled")}
                  </li>
                </ul>
                <p>
                  {t("help.statesFollowClock")}
                </p>
              </Answer>

              <Answer question={t("help.ticket.valid.q")}>
                <p>
                  {t("help.ticket.valid.a", {
                    minutes: TICKET_RULES.GRACE_MINUTES,
                  })}
                </p>
              </Answer>

              <Answer question={t("help.ticket.offline.q")}>
                <p>{t("help.ticket.offline.a1")}</p>
                <p>{t("help.ticket.offline.a2")}</p>
              </Answer>

              <Answer question={t("help.ticket.devices.q")}>
                <p>{t("help.ticket.devices.a")}</p>
              </Answer>
            </Section>

            <Section title={t("help.live.heading")}>
              <Answer question={t("help.live.which.q")}>
                <p>{t("help.live.which.a", { minutes: staleMinutes })}</p>
                <p>
                  <Link to="/map" className="text-primary font-medium underline">
                    {t("help.live.link")}
                  </Link>
                  {t("about.sentenceEnd")}
                </p>
              </Answer>

              <Answer question={t("help.live.empty.q")}>
                <p>{t("help.live.empty.a")}</p>
              </Answer>

              <Answer question={t("help.live.driver.q")}>
                <p>{t("help.live.driver.a")}</p>
              </Answer>
            </Section>

            <Section title={t("help.alerts.heading")}>
              <Answer question={t("help.alerts.when.q")}>
                <p>
                  {t("help.alerts.when.a", {
                    radius: ARRIVAL_RULES.ALERT_RADIUS_KM,
                  })}
                </p>
                <p>{t("help.alerts.proximity")}</p>
              </Answer>

              <Answer question={t("help.alerts.off.q")}>
                <p>{t("help.alerts.off.a")}</p>
              </Answer>
            </Section>

            <Section title={t("help.data.heading")}>
              <Answer question={t("help.data.stored.q")}>
                <p>{t("help.data.stored.a1")}</p>
                <p>{t("help.data.stored.a2")}</p>
              </Answer>

              <Answer question={t("help.data.location.q")}>
                <p>{t("help.data.location.a")}</p>
              </Answer>

              <Answer question={t("help.data.others.q")}>
                <p>{t("help.data.others.a1")}</p>
                <p>{t("help.data.others.a2")}</p>
              </Answer>

              <Answer question={t("help.data.delete.q")}>
                <p>
                  {t("help.data.delete.lead")}{" "}
                  <Link to="/contact" className="text-primary font-medium underline">
                    {t("help.data.delete.link")}
                  </Link>
                  {t("about.sentenceEnd")}
                </p>
              </Answer>
            </Section>

            <Section title={t("help.account.heading")}>
              <Answer question={t("help.account.password.q")}>
                <p>
                  {t("help.account.password.lead")}{" "}
                  <Link to="/login" className="text-primary font-medium underline">
                    {t("help.account.password.link")}
                  </Link>{" "}
                  {t("help.account.password.rest")}
                </p>
              </Answer>

              <Answer question={t("help.account.wrong.q")}>
                <p>
                  {t("help.account.wrong.lead")}{" "}
                  <Link to="/contact" className="text-primary font-medium underline">
                    {t("help.account.wrong.link")}
                  </Link>{" "}
                  {t("help.account.wrong.rest")}
                </p>
              </Answer>
            </Section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Help;
