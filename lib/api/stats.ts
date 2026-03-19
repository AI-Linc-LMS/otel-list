import axios, { AxiosInstance } from 'axios';

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export type StatsBucket = 'minute' | 'hour' | 'day';
export type EndpointsSort = 'failures' | 'slowest' | 'lowest_success';

export interface StatsQueryParams {
  from?: string;
  to?: string;
  serviceName?: string;
  limit?: number;
  bucket?: StatsBucket;
}

/** Echoed query / semantics from GET /api/stats */
export interface StatsPeriod {
  from: string;
  to: string;
  bucket: string;
  serverOnly: boolean;
  serviceNameFilter: string | null;
  httpErrors?: boolean;
  failureCountsAs?: string;
}

export interface StatsOverview {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRatePercent: number;
  errorRatePercent: number;
  avgDurationMs: number;
  minDurationMs?: number;
  maxDurationMs?: number;
  p50DurationMs?: number;
  p95DurationMs?: number;
  p99DurationMs?: number;
  /** legacy field names (older API) */
  min?: number;
  max?: number;
  p50?: number;
  p95?: number;
  p99?: number;
}

export interface TimeSeriesPoint {
  /** ISO bucket start (current API) */
  bucketStart?: string;
  /** legacy / alternate names */
  bucket?: string;
  at?: string;
  t?: string;
  total: number;
  failed: number;
  success: number;
  avgDurationMs: number;
}

/** Ranked endpoint / span row — field names may vary by backend */
export interface RankedEndpoint {
  method?: string;
  route?: string;
  path?: string;
  name?: string;
  spanName?: string;
  httpRoute?: string;
  serviceName?: string;
  requests?: number;
  total?: number;
  count?: number;
  failures?: number;
  failed?: number;
  failedCount?: number;
  errors?: number;
  successRatePercent?: number;
  successRate?: number;
  successful?: number;
  avgDurationMs?: number;
  avgMs?: number;
  maxDurationMs?: number;
  p95?: number;
  [key: string]: unknown;
}

export interface ByServiceRow {
  serviceName?: string;
  service?: string;
  totalRequests?: number;
  total?: number;
  successful?: number;
  successfulRequests?: number;
  failed?: number;
  failedRequests?: number;
  failures?: number;
  successRatePercent?: number;
  avgDurationMs?: number;
  [key: string]: unknown;
}

/** Collection / query diagnostics from GET /api/stats */
export interface StatsDiagnostics {
  documentsInTimeRange?: number;
  documentsAfterFilters?: number;
  estimatedTotalInCollection?: number;
  [key: string]: unknown;
}

export interface DashboardStatsResponse {
  period?: StatsPeriod;
  overview: StatsOverview;
  timeSeries: TimeSeriesPoint[];
  frequentlyFailingApis: RankedEndpoint[];
  slowestApis: RankedEndpoint[];
  byService: ByServiceRow[];
  diagnostics?: StatsDiagnostics;
}

function toQuery(params?: StatsQueryParams): Record<string, string | number | boolean> {
  const q: Record<string, string | number | boolean> = { serverOnly: false };
  if (!params) return q;
  if (params.from) q.from = params.from;
  if (params.to) q.to = params.to;
  if (params.serviceName) q.serviceName = params.serviceName;
  if (params.limit != null) q.limit = params.limit;
  if (params.bucket) q.bucket = params.bucket;
  return q;
}

/** Read latency fields from current or legacy overview shape */
export function overviewMinMs(o: StatsOverview): number | undefined {
  const v = o.minDurationMs ?? o.min;
  return v != null ? Number(v) : undefined;
}

export function overviewMaxMs(o: StatsOverview): number | undefined {
  const v = o.maxDurationMs ?? o.max;
  return v != null ? Number(v) : undefined;
}

export function overviewP50Ms(o: StatsOverview): number | undefined {
  const v = o.p50DurationMs ?? o.p50;
  return v != null ? Number(v) : undefined;
}

export function overviewP95Ms(o: StatsOverview): number | undefined {
  const v = o.p95DurationMs ?? o.p95;
  return v != null ? Number(v) : undefined;
}

export function overviewP99Ms(o: StatsOverview): number | undefined {
  const v = o.p99DurationMs ?? o.p99;
  return v != null ? Number(v) : undefined;
}

export const statsApi = {
  /**
   * Full dashboard: overview, time series, failing/slow APIs, by service.
   */
  getStats: async (params?: StatsQueryParams): Promise<DashboardStatsResponse> => {
    const response = await apiClient.get<
      DashboardStatsResponse | { data?: DashboardStatsResponse }
    >('/api/stats', {
      params: toQuery(params),
    });
    const d = response.data;
    if (d && typeof d === 'object' && 'overview' in d) return d as DashboardStatsResponse;
    if (d && typeof d === 'object' && 'data' in d && d.data && typeof d.data === 'object')
      return d.data as DashboardStatsResponse;
    return d as DashboardStatsResponse;
  },

  getOverview: async (params?: Omit<StatsQueryParams, 'bucket'>): Promise<StatsOverview> => {
    const response = await apiClient.get<StatsOverview>('/api/stats/overview', {
      params: toQuery(params),
    });
    return response.data;
  },

  getTimeseries: async (
    params?: StatsQueryParams & { bucket?: StatsBucket }
  ): Promise<TimeSeriesPoint[]> => {
    const response = await apiClient.get<TimeSeriesPoint[] | { data?: TimeSeriesPoint[] }>(
      '/api/stats/timeseries',
      { params: toQuery(params) }
    );
    const d = response.data;
    if (Array.isArray(d)) return d;
    if (d && typeof d === 'object' && Array.isArray(d.data)) return d.data;
    return [];
  },

  getEndpoints: async (
    params?: StatsQueryParams & { sort?: EndpointsSort }
  ): Promise<RankedEndpoint[]> => {
    const q = { ...toQuery(params) } as Record<string, string | number | boolean>;
    if (params?.sort) q.sort = params.sort;
    const response = await apiClient.get<RankedEndpoint[] | { data?: RankedEndpoint[] }>(
      '/api/stats/endpoints',
      { params: q }
    );
    const d = response.data;
    if (Array.isArray(d)) return d;
    if (d && typeof d === 'object' && Array.isArray(d.data)) return d.data;
    return [];
  },
};

/** Default window: last 24 hours */
export function defaultStatsRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function endpointLabel(row: RankedEndpoint): string {
  if (row.name && String(row.name).trim()) return String(row.name).trim();
  const route = row.route ?? row.path ?? row.httpRoute ?? row.spanName ?? '';
  const method = row.method ? `${row.method} ` : '';
  return `${method}${route}`.trim() || '(unknown)';
}

export function failuresCount(row: RankedEndpoint): number {
  return Number(row.failures ?? row.failed ?? row.failedCount ?? row.errors ?? 0);
}

export function successfulCount(row: RankedEndpoint): number | null {
  if (row.successful != null) return Number(row.successful);
  if (row.successfulRequests != null) return Number(row.successfulRequests);
  return null;
}

export function endpointTotalCount(row: RankedEndpoint): number | null {
  if (row.total != null) return Number(row.total);
  if (row.requests != null) return Number(row.requests);
  if (row.count != null) return Number(row.count);
  return null;
}

export function maxDurationMs(row: RankedEndpoint): number | null {
  if (row.maxDurationMs != null) return Number(row.maxDurationMs);
  return null;
}

export function totalCount(row: RankedEndpoint): number {
  return Number(row.requests ?? row.total ?? row.count ?? 0);
}

export function successRate(row: RankedEndpoint): number | null {
  if (row.successRatePercent != null) return Number(row.successRatePercent);
  if (row.successRate != null) return Number(row.successRate) * (row.successRate <= 1 ? 100 : 1);
  return null;
}

export function avgDuration(row: RankedEndpoint): number | null {
  if (row.avgDurationMs != null) return Number(row.avgDurationMs);
  if (row.avgMs != null) return Number(row.avgMs);
  return null;
}

/** Raw ISO (or string) bucket start from API */
export function timeSeriesBucketStartRaw(p: TimeSeriesPoint): string {
  const raw = p.bucketStart ?? p.bucket ?? p.at ?? p.t;
  return raw != null ? String(raw) : '';
}

export function timeSeriesBucketLabel(p: TimeSeriesPoint): string {
  const raw = timeSeriesBucketStartRaw(p);
  if (!raw) return '';
  const d = new Date(raw);
  return Number.isNaN(d.getTime())
    ? raw
    : d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}
