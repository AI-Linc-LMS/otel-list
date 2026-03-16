'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { tracesApi, Trace, TracesTableParams, TracesTableResponse } from '@/lib/api/traces';

export default function TracesTable() {
  const router = useRouter();
  const [data, setData] = useState<TracesTableResponse>({
    data: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<TracesTableParams>({
    page: 1,
    limit: 10,
    sortBy: 'startTime',
    order: 'desc',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tracesApi.getTracesTable(params);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch traces');
      console.error('Error fetching traces:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageChange = (newPage: number) => {
    setParams((prev) => ({ ...prev, page: newPage }));
  };

  const handleSort = (sortBy: string) => {
    setParams((prev) => ({
      ...prev,
      sortBy,
      order: prev.sortBy === sortBy && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleFilterChange = (key: keyof TracesTableParams, value: any) => {
    setParams((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const formatKind = (kind: number | undefined): string => {
    if (kind === undefined) return '-';
    
    const kindMap: Record<number, string> = {
      0: 'INTERNAL',
      1: 'SERVER',
      2: 'CLIENT',
      3: 'PRODUCER',
      4: 'CONSUMER',
    };
    
    return kindMap[kind] || `Unknown (${kind})`;
  };

  const getKindTooltip = (kind: number | undefined): string => {
    if (kind === undefined) return 'Kind not specified';
    
    const kindMap: Record<number, string> = {
      0: 'INTERNAL (0) - inside app',
      1: 'SERVER (1) - server receives request',
      2: 'CLIENT (2) - client makes request',
      3: 'PRODUCER (3) - message producer',
      4: 'CONSUMER (4) - message consumer',
    };
    
    return kindMap[kind] || `Unknown kind: ${kind}`;
  };

  const getKindColor = (kind: number | undefined): string => {
    if (kind === undefined) return 'bg-gray-100 text-gray-600 border-gray-200';
    
    const colorMap: Record<number, string> = {
      0: 'bg-purple-100 text-purple-800 border-purple-200',
      1: 'bg-blue-100 text-blue-800 border-blue-200',
      2: 'bg-green-100 text-green-800 border-green-200',
      3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      4: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    
    return colorMap[kind] || 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const getHttpMethod = (trace: Trace): string => {
    // Check attributes array for http.method
    if (trace.attributes && Array.isArray(trace.attributes)) {
      const methodAttr = trace.attributes.find((attr: any) => attr.key === 'http.method');
      if (methodAttr && methodAttr.value) {
        return methodAttr.value.toUpperCase();
      }
    }
    
    // Check name field for HTTP method
    if (trace.name) {
      const nameUpper = trace.name.toUpperCase();
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      for (const method of methods) {
        if (nameUpper.includes(method)) {
          return method;
        }
      }
    }
    
    return '-';
  };

  const getMethodColor = (method: string): string => {
    const methodUpper = method.toUpperCase();
    if (methodUpper === 'GET') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (methodUpper === 'POST') return 'bg-green-100 text-green-800 border-green-200';
    if (methodUpper === 'PUT' || methodUpper === 'PATCH') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (methodUpper === 'DELETE') return 'bg-red-100 text-red-800 border-red-200';
    if (methodUpper === 'HEAD' || methodUpper === 'OPTIONS') return 'bg-gray-100 text-gray-800 border-gray-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  if (loading && data.data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-gray-600">Loading traces...</div>
      </div>
    );
  }

  if (error && data.data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Traces</h1>
        <p className="text-sm text-gray-600">View and manage trace data</p>
      </div>
      
      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search by Trace ID..."
            value={params.traceId || ''}
            onChange={(e) => handleFilterChange('traceId', e.target.value || undefined)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <input
            type="number"
            placeholder="Start Time"
            value={params.startTime || ''}
            onChange={(e) => handleFilterChange('startTime', e.target.value ? Number(e.target.value) : undefined)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <input
            type="number"
            placeholder="End Time"
            value={params.endTime || ''}
            onChange={(e) => handleFilterChange('endTime', e.target.value ? Number(e.target.value) : undefined)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <select
            value={params.limit || 10}
            onChange={(e) => handleFilterChange('limit', Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort('traceId')}
                >
                  <div className="flex items-center gap-2">
                    <span>Trace ID</span>
                    {params.sortBy === 'traceId' && (
                      <span className="text-blue-600">{params.order === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort('kind')}
                >
                  <div className="flex items-center gap-2">
                    <span>Kind</span>
                    {params.sortBy === 'kind' && (
                      <span className="text-blue-600">{params.order === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Request Type
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort('startTime')}
                >
                  <div className="flex items-center gap-2">
                    <span>Start Time</span>
                    {params.sortBy === 'startTime' && (
                      <span className="text-blue-600">{params.order === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleSort('endTime')}
                >
                  <div className="flex items-center gap-2">
                    <span>End Time</span>
                    {params.sortBy === 'endTime' && (
                      <span className="text-blue-600">{params.order === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.data.map((trace: Trace, index: number) => (
                <tr 
                  key={`${trace.id || trace.traceId || 'trace'}-${index}`} 
                  className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                        {trace.traceId || trace._id}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {trace.kind !== undefined ? (
                      <span
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border shadow-sm ${getKindColor(trace.kind)} cursor-help transition-transform hover:scale-105`}
                        title={getKindTooltip(trace.kind)}
                      >
                        {formatKind(trace.kind)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const method = getHttpMethod(trace);
                      return method !== '-' ? (
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border shadow-sm ${getMethodColor(method)} transition-transform hover:scale-105`}>
                          {method}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {trace.startTime
                        ? new Date(trace.startTime).toLocaleString()
                        : <span className="text-gray-400">-</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {trace.endTime
                        ? new Date(trace.endTime).toLocaleString()
                        : <span className="text-gray-400">-</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => {
                        router.push(`/trace/${trace.id || trace._id}`);
                      }}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-150 hover:shadow-md"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Showing</span>{' '}
            <span className="font-semibold text-gray-900">
              {data.data.length > 0 ? (data.page - 1) * data.limit + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-gray-900">
              {Math.min(data.page * data.limit, data.total)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-gray-900">{data.total}</span> traces
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(data.page - 1)}
              disabled={data.page <= 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 hover:shadow-md disabled:hover:shadow-none"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </div>
            </button>
            <div className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg">
              Page <span className="font-semibold text-gray-900">{data.page}</span> of{' '}
              <span className="font-semibold text-gray-900">{data.totalPages || 1}</span>
            </div>
            <button
              onClick={() => handlePageChange(data.page + 1)}
              disabled={data.page >= data.totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 hover:shadow-md disabled:hover:shadow-none"
            >
              <div className="flex items-center gap-2">
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
