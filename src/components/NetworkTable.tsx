import { Link } from "react-router-dom";
import type { NetworkGrid } from "@/domain/transit/network-diagram";
import { getNetworkRoute } from "@/domain/transit/routes";
import { useTranslation } from "@/contexts/LocaleContext";
import { SCHEDULED_STOPS } from "@/domain/transit/schedule";

/**
 * The diagram's equivalent, in text.
 *
 * Not a 39-by-7 matrix of ticks: a screen reader would read 273 cells, most of
 * them empty, to answer one question. One row per stop naming the routes that
 * call there says the same thing in a form somebody can actually get through,
 * and it stays copy-pasteable.
 */
const NetworkTable = ({ grid }: { grid: NetworkGrid }) => {
  const { t } = useTranslation();

  return (
  <div className="overflow-auto max-h-[70vh] rounded-2xl border border-border bg-card">
    <table className="w-full border-separate border-spacing-0 text-sm">
      <caption className="sr-only">
        {t("network.caption")}
      </caption>
      <thead>
        <tr>
          <th
            scope="col"
            className="sticky top-0 z-10 bg-primary text-primary-foreground text-left px-3 py-2 font-semibold"
          >
            {t("network.col.stop")}
          </th>
          <th
            scope="col"
            className="sticky top-0 z-10 bg-primary text-primary-foreground text-left px-3 py-2 font-semibold"
          >
            {t("network.col.routes")}
          </th>
        </tr>
      </thead>
      <tbody>
        {grid.rows.map((row, index) => (
          <tr key={row.stop} className={index % 2 === 0 ? "bg-card" : "bg-secondary"}>
            <th
              scope="row"
              className="px-3 py-2 text-left font-medium text-foreground border-b border-border align-top"
            >
              {SCHEDULED_STOPS.has(row.stop) ? (
                <Link
                  to={`/plan?from=${encodeURIComponent(row.stop)}`}
                  className="hover:text-primary underline-offset-2 hover:underline"
                >
                  {row.stop}
                  <span className="sr-only"> - plan a journey from here</span>
                </Link>
              ) : (
                row.stop
              )}

              {row.interchange && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {t("network.interchange")}
                </span>
              )}
            </th>

            <td className="px-3 py-2 text-muted-foreground border-b border-border align-top">
              {row.routeIds.map((id) => getNetworkRoute(id).name).join(", ")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  );
};

export default NetworkTable;
