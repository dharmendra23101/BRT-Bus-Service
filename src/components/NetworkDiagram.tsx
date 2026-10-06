import {
  ROUTE_CODES,
  describeNetwork,
  routeSegments,
  type NetworkGrid,
} from "@/domain/transit/network-diagram";
import type { NetworkRouteId } from "@/domain/transit/routes";
import type { VehicleTelemetry } from "@/domain/fleet/telemetry";

const ROW_HEIGHT = 26;
const HEADER_HEIGHT = 42;
const LABEL_WIDTH = 188;
const COLUMN_WIDTH = 40;
const FIRST_COLUMN_X = LABEL_WIDTH + 24;

interface NetworkDiagramProps {
  grid: NetworkGrid;
  /** The route drawn in full strength; the rest are context. */
  selectedId: NetworkRouteId | null;
  /**
   * Vehicles to place on the diagram.
   *
   * Placed by the stop they report heading for, never by a coordinate - which
   * is the only way a vehicle can be shown here honestly, and the reason the
   * diagram was built from topology in the first place.
   */
  vehicles?: readonly VehicleTelemetry[];
}

/**
 * The network as a schematic.
 *
 * Rows are stops and columns are routes, which is the orientation that fits a
 * phone: seven columns go across a narrow screen and thirty-nine stop names do
 * not, and a stop name reads far better horizontally than rotated.
 *
 * The row order is a topological sort of the routes' own stop orders, so it is
 * derived from the published network rather than from geography - see
 * `network-diagram.ts` for why that is the only honest option here. Distances
 * on this diagram mean nothing, and it does not pretend otherwise: it is a
 * connection diagram, in the same sense that a tube map is.
 *
 * Presentational on purpose. It carries `role="img"` with a description rather
 * than being a field of small click targets, and the table beside it is the
 * equivalent anyone can read, tab through or copy.
 */
const NetworkDiagram = ({
  grid,
  selectedId,
  vehicles = [],
}: NetworkDiagramProps) => {
  const width = FIRST_COLUMN_X + grid.routes.length * COLUMN_WIDTH;
  const height = HEADER_HEIGHT + grid.rows.length * ROW_HEIGHT + 8;

  const columnX = (index: number) =>
    FIRST_COLUMN_X + index * COLUMN_WIDTH + COLUMN_WIDTH / 2;

  const rowY = (index: number) => HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2;

  return (
    <div className="overflow-auto max-h-[70vh] rounded-2xl border border-border bg-card">
      <svg
        role="img"
        aria-label={describeNetwork(grid)}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="block"
      >
        {/* Interchange rows get a band, so a change point is findable at a glance. */}
        {grid.rows.map((row, index) =>
          row.interchange ? (
            <rect
              key={`band-${row.stop}`}
              x={0}
              y={HEADER_HEIGHT + index * ROW_HEIGHT}
              width={width}
              height={ROW_HEIGHT}
              className="fill-secondary"
            />
          ) : null
        )}

        {grid.routes.map((route, column) => (
          <text
            key={`head-${route.id}`}
            x={columnX(column)}
            y={HEADER_HEIGHT - 14}
            textAnchor="middle"
            className={`text-[11px] font-semibold ${
              selectedId === route.id ? "fill-primary" : "fill-muted-foreground"
            }`}
          >
            {ROUTE_CODES[route.id]}
          </text>
        ))}

        {grid.routes.map((route, column) => {
          const dimmed = selectedId !== null && selectedId !== route.id;
          const x = columnX(column);

          return (
            <g
              key={route.id}
              className={dimmed ? "opacity-30" : "opacity-100"}
            >
              {routeSegments(grid, route.id).map(([from, to]) => (
                <line
                  key={`${route.id}-${from}`}
                  x1={x}
                  y1={rowY(from)}
                  x2={x}
                  y2={rowY(to)}
                  strokeWidth={selectedId === route.id ? 4 : 2.5}
                  strokeLinecap="round"
                  className="stroke-primary"
                />
              ))}

              {grid.rows.map((row, index) =>
                row.routeIds.includes(route.id) ? (
                  <circle
                    key={`${route.id}-${row.stop}`}
                    cx={x}
                    cy={rowY(index)}
                    r={row.interchange ? 5 : 3.5}
                    strokeWidth={2}
                    className={
                      row.interchange
                        ? "fill-card stroke-primary"
                        : "fill-primary stroke-primary"
                    }
                  />
                ) : null
              )}
            </g>
          );
        })}

        {/*
          Vehicles, placed by the stop they report heading for.

          A vehicle with no reported stop is not drawn at all rather than
          guessed at - there is no honest column for it.
        */}
        {vehicles.map((vehicle) => {
          /*
            `stopRef` is the SOURCE's own string, which is why it is typed as
            one: an operator feed's stop ids are not our stop names. It is
            matched against the registry rather than cast, so a feed we cannot
            resolve draws nothing instead of drawing something wrong.
          */
          const rowIndex = grid.rows.findIndex((row) => row.stop === vehicle.stopRef);

          if (rowIndex < 0) return null;

          // The column is one of the routes actually calling at that stop.
          const column = grid.routes.findIndex((route) =>
            grid.rows[rowIndex]!.routeIds.includes(route.id)
          );

          if (column < 0) return null;

          return (
            <rect
              key={`vehicle-${vehicle.vehicleId}`}
              x={columnX(column) - 4.5}
              y={rowY(rowIndex) - 4.5}
              width={9}
              height={9}
              rx={2}
              className="fill-primary-deep stroke-card"
              strokeWidth={1.5}
            />
          );
        })}

        {grid.rows.map((row, index) => (
          <text
            key={`label-${row.stop}`}
            x={LABEL_WIDTH}
            y={rowY(index) + 4}
            textAnchor="end"
            className={`text-[11px] ${
              row.interchange
                ? "font-semibold fill-foreground"
                : "fill-muted-foreground"
            }`}
          >
            {row.stop}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default NetworkDiagram;
