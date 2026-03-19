"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  statsApi,
  type DashboardStatsResponse,
  type StatsBucket,
  type TimeSeriesPoint,
  type RankedEndpoint,
  type ByServiceRow,
  type StatsDiagnostics,
  endpointLabel,
  failuresCount,
  successfulCount,
  endpointTotalCount,
  maxDurationMs,
  successRate,
  avgDuration,
  timeSeriesBucketLabel,
  timeSeriesBucketStartRaw,
  overviewMinMs,
  overviewMaxMs,
  overviewP50Ms,
  overviewP95Ms,
  overviewP99Ms,
} from "@/lib/api/stats";

function formatMs(ms: number | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatPct(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Number(n).toFixed(1)}%`;
}

function formatMsExact(ms: number | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  return `${Number(ms).toLocaleString(undefined, { maximumFractionDigits: 2 })} ms`;
}

/** Preset window for stats API `from` / `to` (rolling from now, except custom). */
export type RangePreset =
  | "24h"
  | "1d"
  | "3d"
  | "7d"
  | "1w"
  | "2w"
  | "1M"
  | "custom";

const MS_DAY = 24 * 60 * 60 * 1000;

/** `datetime-local` value in the user's timezone */
function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function computeRangeBounds(
  preset: RangePreset,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  const toDate = new Date();

  if (preset === "custom") {
    let fromD = new Date(customFrom);
    let toD = new Date(customTo);
    if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime())) {
      toD = new Date();
      fromD = new Date(toD.getTime() - MS_DAY);
    }
    if (fromD.getTime() >= toD.getTime()) {
      toD = new Date();
      fromD = new Date(toD.getTime() - MS_DAY);
    }
    return { from: fromD.toISOString(), to: toD.toISOString() };
  }

  let fromDate: Date;
  switch (preset) {
    case "24h":
    case "1d":
      fromDate = new Date(toDate.getTime() - MS_DAY);
      break;
    case "3d":
      fromDate = new Date(toDate.getTime() - 3 * MS_DAY);
      break;
    case "7d":
    case "1w":
      fromDate = new Date(toDate.getTime() - 7 * MS_DAY);
      break;
    case "2w":
      fromDate = new Date(toDate.getTime() - 14 * MS_DAY);
      break;
    case "1M":
      fromDate = new Date(toDate);
      fromDate.setMonth(fromDate.getMonth() - 1);
      break;
    default:
      fromDate = new Date(toDate.getTime() - MS_DAY);
  }
  return { from: fromDate.toISOString(), to: toDate.toISOString() };
}

function KpiCard({
  title,
  value,
  sub,
  accent,
}: {
  title: string;
  value: string;
  sub?: string;
  accent?: "default" | "green" | "red" | "amber";
}) {
  const border =
    accent === "green"
      ? "border-emerald-200"
      : accent === "red"
        ? "border-rose-200"
        : accent === "amber"
          ? "border-amber-200"
          : "border-gray-200";
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${border}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {title}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-gray-500">{sub}</p> : null}
    </div>
  );
}

type ChartRow = {
  name: string;
  bucketStartISO: string;
  total: number;
  success: number;
  failed: number;
  avgDurationMs: number;
};

function TimeSeriesTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const bucketLabel = row.bucketStartISO
    ? (() => {
        const d = new Date(row.bucketStartISO);
        return Number.isNaN(d.getTime())
          ? row.bucketStartISO
          : d.toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
      })()
    : row.name;
  const okPct =
    row.total > 0 ? ((row.success / row.total) * 100).toFixed(1) : "—";
  const failPct =
    row.total > 0 ? ((row.failed / row.total) * 100).toFixed(1) : "—";

  return (
    <div className="max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-lg">
      <p className="mb-2 border-b border-gray-100 pb-2 font-semibold text-gray-900">
        {bucketLabel}
      </p>
      {row.bucketStartISO ? (
        <p className="mb-2 font-mono text-[10px] leading-relaxed text-gray-500 break-all">
          bucketStart: {row.bucketStartISO}
        </p>
      ) : null}
      <dl className="space-y-1.5 text-gray-800">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Total</dt>
          <dd className="tabular-nums font-medium">{row.total}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-emerald-600">Success</dt>
          <dd className="tabular-nums text-emerald-800">
            {row.success}
            {row.total > 0 ? ` (${okPct}%)` : ""}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-rose-600">Failed</dt>
          <dd className="tabular-nums text-rose-800">
            {row.failed}
            {row.total > 0 ? ` (${failPct}%)` : ""}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-gray-100 pt-1.5">
          <dt className="text-indigo-600">Avg duration</dt>
          <dd className="text-right text-indigo-900">
            <span className="font-medium">{formatMs(row.avgDurationMs)}</span>
            <span className="mt-0.5 block text-[10px] font-normal text-gray-500">
              ({formatMsExact(row.avgDurationMs)})
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function TimeSeriesChart({ points }: { points: TimeSeriesPoint[] }) {
  const chartData: ChartRow[] = useMemo(
    () =>
      points.map((p) => {
        const success = p.success ?? 0;
        const failed = p.failed ?? 0;
        const total =
          p.total != null && !Number.isNaN(Number(p.total))
            ? Number(p.total)
            : success + failed;
        return {
          name: timeSeriesBucketLabel(p),
          bucketStartISO: timeSeriesBucketStartRaw(p),
          total,
          success,
          failed,
          avgDurationMs: Number(p.avgDurationMs ?? 0),
        };
      }),
    [points],
  );

  if (!points.length) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
        No time series data for this range
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-gray-900">
          Requests &amp; latency over time
        </h3>
        <p className="text-xs text-gray-500">
          Stacked bars: success vs failed. Line: average duration per bucket
          (right axis).
        </p>
      </div>
      <div className="h-[320px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#6b7280" }}
              interval="preserveStartEnd"
              angle={chartData.length > 12 ? -35 : 0}
              textAnchor={chartData.length > 12 ? "end" : "middle"}
              height={chartData.length > 12 ? 56 : 32}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              allowDecimals={false}
              label={{
                value: "Requests",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#9ca3af", fontSize: 11 },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              label={{
                value: "Avg ms",
                angle: 90,
                position: "insideRight",
                style: { fill: "#9ca3af", fontSize: 11 },
              }}
            />
            <Tooltip content={<TimeSeriesTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => (
                <span className="text-gray-700">{value}</span>
              )}
            />
            <Bar
              yAxisId="left"
              dataKey="success"
              name="Success"
              stackId="req"
              fill="#10b981"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="failed"
              name="Failed"
              stackId="req"
              fill="#f43f5e"
              radius={[2, 2, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgDurationMs"
              name="Avg duration (ms)"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 2, fill: "#6366f1" }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EndpointsTable({
  title,
  rows,
  mode = "default",
}: {
  title: string;
  rows: RankedEndpoint[];
  /** Full columns (same shape as frequentlyFailingApis / slowestApis) */
  mode?: "default" | "ranked";
}) {
  if (!rows?.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">No data</p>
      </div>
    );
  }

  if (mode === "ranked") {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white text-left text-xs font-semibold uppercase text-gray-500 shadow-sm">
              <tr>
                <th className="px-3 py-2">Endpoint</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Failed</th>
                <th className="px-3 py-2 text-right">OK</th>
                <th className="px-3 py-2 text-right">Success %</th>
                <th className="px-3 py-2 text-right">Avg ms</th>
                <th className="px-3 py-2 text-right">Max ms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, i) => {
                const label = endpointLabel(row);
                const total = endpointTotalCount(row);
                const failed = failuresCount(row);
                const ok = successfulCount(row);
                const sr = successRate(row);
                const avg = avgDuration(row);
                const maxMs = maxDurationMs(row);
                return (
                  <tr key={i} className="hover:bg-gray-50/80">
                    <td
                      className="max-w-[min(28rem,55vw)] px-3 py-2 align-top font-mono text-xs text-gray-800 break-words whitespace-normal"
                      title={label}
                    >
                      {label}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                      {total != null ? total : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-rose-700">
                      {failed}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-800">
                      {ok != null ? ok : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {sr != null ? formatPct(sr) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {avg != null ? formatMsExact(avg) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                      {maxMs != null ? formatMsExact(maxMs) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="max-h-72 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-white text-left text-xs font-semibold uppercase text-gray-500 shadow-sm">
            <tr>
              <th className="px-4 py-2">Endpoint</th>
              <th className="px-4 py-2 text-right">Success rate</th>
              <th className="px-4 py-2 text-right">Avg time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50/80">
                <td
                  className="max-w-[220px] truncate px-4 py-2 font-mono text-xs text-gray-800"
                  title={endpointLabel(row)}
                >
                  {endpointLabel(row)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {successRate(row) != null
                    ? formatPct(successRate(row)!)
                    : "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                  {formatMs(avgDuration(row) ?? undefined)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ByServiceTable({ rows }: { rows: ByServiceRow[] }) {
  if (!rows?.length) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">By service</h3>
      </div>
      <div className="max-h-64 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white text-left text-xs font-semibold uppercase text-gray-500 shadow-sm">
            <tr>
              <th className="px-4 py-2">Service</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Failed</th>
              <th className="px-4 py-2 text-right">OK</th>
              <th className="px-4 py-2 text-right">Success %</th>
              <th className="px-4 py-2 text-right">Avg ms</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => {
              const name = String(row.serviceName ?? row.service ?? "—");
              const totalRaw = row.total ?? row.totalRequests;
              const total = totalRaw != null ? Number(totalRaw) : null;
              const failed = Number(
                row.failed ?? row.failedRequests ?? row.failures ?? 0,
              );
              const ok = row.successful ?? row.successfulRequests;
              const okNum = ok != null ? Number(ok) : null;
              const sr = row.successRatePercent;
              const avg = row.avgDurationMs;
              return (
                <tr key={i} className="hover:bg-gray-50/80">
                  <td className="px-4 py-2 font-medium text-gray-800">
                    {name}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-900">
                    {total != null ? total.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-rose-700">
                    {failed}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-emerald-800">
                    {okNum != null ? okNum : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {sr != null ? formatPct(Number(sr)) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">
                    {avg != null ? formatMsExact(Number(avg)) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DiagnosticsPanel({ d }: { d: StatsDiagnostics }) {
  const hasAny =
    d.documentsInTimeRange != null ||
    d.documentsAfterFilters != null ||
    d.estimatedTotalInCollection != null;
  if (!hasAny) return null;
  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold text-amber-900">Diagnostics</p>
      <dl className="mt-2 grid gap-2 sm:grid-cols-3">
        {d.documentsInTimeRange != null ? (
          <div className="rounded-lg bg-white/80 px-3 py-2 shadow-sm">
            <dt className="text-xs font-medium text-amber-800/90">
              In time range
            </dt>
            <dd className="tabular-nums text-lg font-semibold text-amber-950">
              {Number(d.documentsInTimeRange).toLocaleString()}
            </dd>
          </div>
        ) : null}
        {d.documentsAfterFilters != null ? (
          <div className="rounded-lg bg-white/80 px-3 py-2 shadow-sm">
            <dt className="text-xs font-medium text-amber-800/90">
              After filters
            </dt>
            <dd className="tabular-nums text-lg font-semibold text-amber-950">
              {Number(d.documentsAfterFilters).toLocaleString()}
            </dd>
          </div>
        ) : null}
        {d.estimatedTotalInCollection != null ? (
          <div className="rounded-lg bg-white/80 px-3 py-2 shadow-sm">
            <dt className="text-xs font-medium text-amber-800/90">
              Est. collection total
            </dt>
            <dd className="tabular-nums text-lg font-semibold text-amber-950">
              {Number(d.estimatedTotalInCollection).toLocaleString()}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export default function QuickStats() {
  const [range, setRange] = useState<RangePreset>("24h");
  const [customFrom, setCustomFrom] = useState(() =>
    toDatetimeLocalValue(new Date(Date.now() - MS_DAY)),
  );
  const [customTo, setCustomTo] = useState(() => toDatetimeLocalValue(new Date()));
  const [bucket, setBucket] = useState<StatsBucket>("hour");
  const [serviceName, setServiceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardStatsResponse | null>(null);

  const { from, to } = useMemo(
    () => computeRangeBounds(range, customFrom, customTo),
    [range, customFrom, customTo],
  );

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await statsApi.getStats({
        from,
        to,
        bucket,
        limit: 50,
        serviceName: serviceName.trim() || undefined,
      });
      setData(res);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as Error).message)
          : "Failed to load stats";
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, bucket, serviceName]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const overview = data?.overview;

  return (
    <div className="w-full space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quick stats</h2>
          <p className="text-sm text-gray-600">
            KPIs, time series, and ranked endpoints from OpenTelemetry data
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchStats()}
          className="self-start rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-gray-500">
            Range
          </label>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangePreset)}
            className="mt-1 min-w-[11rem] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="24h">Last 24 hours</option>
            <option value="1d">Last 1 day</option>
            <option value="3d">Last 3 days</option>
            <option value="7d">Last 7 days</option>
            <option value="1w">Last 1 week</option>
            <option value="2w">Last 2 weeks</option>
            <option value="1M">Last 1 month</option>
            <option value="custom">Custom…</option>
          </select>
        </div>
        {range === "custom" ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500">
                From (local)
              </label>
              <input
                type="datetime-local"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">
                To (local)
              </label>
              <input
                type="datetime-local"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </>
        ) : null}
        <div>
          <label className="block text-xs font-medium text-gray-500">
            Chart bucket
          </label>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value as StatsBucket)}
            className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="minute">Minute</option>
            <option value="hour">Hour</option>
            <option value="day">Day</option>
          </select>
        </div>
        <div className="min-w-[180px] flex-1">
          <label className="block text-xs font-medium text-gray-500">
            Service name (optional)
          </label>
          <input
            type="text"
            placeholder="Filter by service"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading && !data ? (
        <div className="py-16 text-center text-gray-600">
          Loading dashboard…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <strong className="font-semibold">Could not load /api/stats.</strong>{" "}
          {error}
          <p className="mt-1 text-xs text-rose-700">
            Ensure your backend exposes GET /api/stats (MongoDB 5.0+ / 5.2+ for
            percentiles) and NEXT_PUBLIC_API_URL is set.
          </p>
        </div>
      ) : null}

      {data?.period ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800">
          <p className="font-medium text-slate-900">Active period</p>
          <p className="mt-1 text-slate-700">
            {new Date(data.period.from).toLocaleString()} →{" "}
            {new Date(data.period.to).toLocaleString()}
            <span className="text-slate-500">
              {" "}
              · bucket <code className="rounded bg-white px-1">{data.period.bucket}</code>
              {data.period.httpErrors != null ? (
                <>
                  {" "}
                  · httpErrors{" "}
                  <code className="rounded bg-white px-1">
                    {String(data.period.httpErrors)}
                  </code>
                </>
              ) : null}
            </span>
          </p>
          {data.period.failureCountsAs ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-700">Failure definition: </span>
              {data.period.failureCountsAs}
            </p>
          ) : null}
        </div>
      ) : null}

      {overview ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          <KpiCard
            title="Total requests"
            value={String(overview.totalRequests ?? 0)}
          />
          <KpiCard
            title="Success rate"
            value={formatPct(overview.successRatePercent)}
            sub={`${overview.successfulRequests ?? 0} ok`}
            accent="green"
          />
          <KpiCard
            title="Error rate"
            value={formatPct(overview.errorRatePercent)}
            sub={`${overview.failedRequests ?? 0} failed`}
            accent="red"
          />
          <KpiCard
            title="Avg duration"
            value={formatMs(overview.avgDurationMs)}
          />
          <KpiCard
            title="Min / max duration"
            value={`${formatMs(overviewMinMs(overview))} / ${formatMs(overviewMaxMs(overview))}`}
            sub="Across sampled spans in window"
          />
          <KpiCard
            title="Latency p50 / p95 / p99"
            value={`${formatMs(overviewP50Ms(overview))} / ${formatMs(overviewP95Ms(overview))} / ${formatMs(overviewP99Ms(overview))}`}
            sub={
              data?.period?.failureCountsAs
                ? "Percentiles (MongoDB $percentile)"
                : "Requires MongoDB $percentile"
            }
          />
        </div>
      ) : null}

      {data?.timeSeries?.length ? (
        <TimeSeriesChart points={data.timeSeries} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <EndpointsTable
          title="Frequently failing APIs"
          rows={data?.frequentlyFailingApis ?? []}
          mode="ranked"
        />
        <EndpointsTable
          title="Slowest APIs (by avg duration)"
          rows={data?.slowestApis ?? []}
          mode="ranked"
        />
      </div>

      {data?.byService?.length ? (
        <ByServiceTable rows={data.byService} />
      ) : null}

      {data?.diagnostics ? <DiagnosticsPanel d={data.diagnostics} /> : null}
    </div>
  );
}
