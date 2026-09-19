import { cn } from "@/lib/utils";
import { formatClock, distanceKm } from "@/lib/format";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  time?: number;
  state?: "pending" | "in_progress" | "done";
}

const PIN_FILL: Record<string, string> = {
  pending: "var(--saffron)",
  in_progress: "var(--primary)",
  done: "var(--verify)",
};

/**
 * Schematic plot of the day's field assignments.
 *
 * Deliberately not a tile map: the prototype does not ship a map provider key,
 * so coordinates are projected onto a labelled schematic so the officer can
 * still judge the spread and order of visits.
 */
export function FieldMap({
  points,
  className,
  onSelect,
}: {
  points: MapPoint[];
  className?: string;
  onSelect?: (id: string) => void;
}) {
  if (points.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-52 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">
          No field locations to plot for this view.
        </p>
      </div>
    );
  }

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = Math.max(maxLat - minLat, 0.01);
  const spanLng = Math.max(maxLng - minLng, 0.01);

  const project = (p: MapPoint) => ({
    x: 8 + ((p.lng - minLng) / spanLng) * 84,
    y: 88 - ((p.lat - minLat) / spanLat) * 76,
  });

  const projected = points.map((p) => ({ point: p, ...project(p) }));
  const route = projected.map((p) => `${p.x},${p.y}`).join(" ");

  let totalKm = 0;
  for (let i = 1; i < points.length; i++) totalKm += distanceKm(points[i - 1], points[i]);

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-card", className)}>
      <div className="grid-backdrop absolute inset-0 opacity-60" aria-hidden="true" />
      <svg
        viewBox="0 0 100 96"
        className="relative h-64 w-full"
        role="img"
        aria-label={`Schematic map of ${points.length} field assignments`}
        preserveAspectRatio="none"
      >
        {projected.length > 1 ? (
          <polyline
            points={route}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="0.6"
            strokeDasharray="2 1.6"
            opacity="0.55"
          />
        ) : null}
        {projected.map((p, index) => (
          <g
            key={p.point.id}
            onClick={() => onSelect?.(p.point.id)}
            className={onSelect ? "cursor-pointer" : undefined}
          >
            <circle cx={p.x} cy={p.y} r="3.4" fill="white" opacity="0.9" />
            <circle
              cx={p.x}
              cy={p.y}
              r="2.6"
              fill={PIN_FILL[p.point.state ?? "pending"]}
              stroke="white"
              strokeWidth="0.5"
            />
            <text
              x={p.x}
              y={p.y + 0.9}
              textAnchor="middle"
              fontSize="2.4"
              fontWeight="700"
              fill="white"
            >
              {index + 1}
            </text>
          </g>
        ))}
      </svg>

      <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card/90 px-4 py-2.5">
        <p className="text-[11px] text-muted-foreground">
          Schematic field plot · prototype, not for navigation
        </p>
        <p className="text-[11px] font-medium text-foreground">
          {points.length} stop{points.length === 1 ? "" : "s"}
          {totalKm > 0 ? ` · ~${totalKm.toFixed(1)} km route` : ""}
        </p>
      </div>
    </div>
  );
}

export function MapPointList({ points }: { points: MapPoint[] }) {
  return (
    <ol className="space-y-1.5">
      {points.map((p, index) => (
        <li key={p.id} className="flex items-start gap-2.5">
          <span
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: PIN_FILL[p.state ?? "pending"] }}
          >
            {index + 1}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium text-foreground">
              {p.time ? `${formatClock(p.time)} · ` : ""}
              {p.label}
            </span>
            {p.sublabel ? (
              <span className="block truncate text-[11px] text-muted-foreground">
                {p.sublabel}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}
