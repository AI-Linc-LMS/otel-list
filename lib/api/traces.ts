import axios, { AxiosInstance } from 'axios';

// Type definitions
export interface Trace {
  _id: string;
  traceId: string;
  serviceName?: string;
  startTime?: number;
  endTime?: number;
  kind?: number;
  attributes?: Array<{ key: string; value: any }> | Record<string, any>;
  name?: string;
  [key: string]: any;
}

export interface Span {
  _id: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name?: string;
  startTime?: number | { $date: string };
  endTime?: number | { $date: string };
  duration?: number;
  attributes?: Array<{ key: string; value: any }> | Record<string, any>;
  kind?: number;
  status?: {
    code: number;
    message?: string | null;
  };
  resource?: Record<string, any>;
  events?: any[];
  [key: string]: any;
}

export interface TracesListParams {
  traceId?: string;
  serviceName?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface TracesTableParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  traceId?: string;
  serviceName?: string;
  startTime?: number;
  endTime?: number;
}

export interface TracesTableResponse {
  data: Trace[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const tracesApi = {
  /**
   * List traces with optional filters
   */
  listTraces: async (params?: TracesListParams): Promise<Trace[]> => {
    const response = await apiClient.get<Trace[]>('/api/traces', { params });
    return response.data;
  },

  /**
   * Get table data for Next.js with pagination and sorting
   */
  getTracesTable: async (params?: TracesTableParams): Promise<TracesTableResponse> => {
    const response = await apiClient.get<TracesTableResponse>('/api/traces/table', { params });
    return response.data;
  },

  /**
   * Get all spans for one trace by traceId
   */
  getTraceSpans: async (traceId: string): Promise<Span[]> => {
    const response = await apiClient.get<Span[]>(`/api/traces/trace/${traceId}`);
    return response.data;
  },

  /**
   * Get one trace by MongoDB _id
   */
  getTraceById: async (id: string): Promise<Trace> => {
    const response = await apiClient.get<Trace>(`/api/traces/${id}`);
    return response.data;
  },
};
