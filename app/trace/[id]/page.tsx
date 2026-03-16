'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { tracesApi, Trace, Span } from '@/lib/api/traces';

interface TraceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function TraceDetailPage({ params }: TraceDetailPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [spans, setSpans] = useState<Span[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'spans'>('details');
  const [spansView, setSpansView] = useState<'cards' | 'table'>('table');

  useEffect(() => {
    if (resolvedParams.id) {
      fetchTraceDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id]);

  const fetchTraceDetails = async () => {
    if (!resolvedParams.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch trace by MongoDB _id
      const traceData = await tracesApi.getTraceById(resolvedParams.id);
      setTrace(traceData);
      
      // Fetch spans by traceId
      const spansTraceId = traceData.traceId || resolvedParams.id;
      const spansData = await tracesApi.getTraceSpans(spansTraceId);
      setSpans(spansData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trace details');
      console.error('Error fetching trace details:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateValue: any): string => {
    if (!dateValue) return '-';
    
    // Handle MongoDB date format { "$date": "..." }
    if (typeof dateValue === 'object' && dateValue.$date) {
      return new Date(dateValue.$date).toLocaleString();
    }
    
    // Handle regular date string or timestamp
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      return new Date(dateValue).toLocaleString();
    }
    
    return '-';
  };

  const formatDuration = (startTime: any, endTime: any, duration?: number): string => {
    if (duration !== undefined) {
      return `${duration} ms`;
    }
    
    const start = startTime?.$date ? new Date(startTime.$date).getTime() : 
                  (typeof startTime === 'number' ? startTime : 
                   (typeof startTime === 'string' ? new Date(startTime).getTime() : null));
    const end = endTime?.$date ? new Date(endTime.$date).getTime() : 
                (typeof endTime === 'number' ? endTime : 
                 (typeof endTime === 'string' ? new Date(endTime).getTime() : null));
    
    if (start && end) {
      return `${end - start} ms`;
    }
    
    return '-';
  };

  const formatKind = (kind: number | undefined): string => {
    if (kind === undefined) return '-';
    
    const kindMap: Record<number, { abbrev: string; full: string }> = {
      0: { abbrev: 'INTERNAL', full: 'Internal - inside app' },
      1: { abbrev: 'SERVER', full: 'Server - server receives request' },
      2: { abbrev: 'CLIENT', full: 'Client - client makes request' },
      3: { abbrev: 'PRODUCER', full: 'Producer - message producer' },
      4: { abbrev: 'CONSUMER', full: 'Consumer - message consumer' },
    };
    
    const kindInfo = kindMap[kind];
    return kindInfo ? kindInfo.abbrev : `Unknown (${kind})`;
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

  const formatStatusCode = (code: number | undefined): string => {
    if (code === undefined) return '-';
    
    const statusMap: Record<number, string> = {
      0: 'OK',
      1: 'ERROR',
      2: 'UNSET',
    };
    
    return statusMap[code] || `UNKNOWN (${code})`;
  };

  const getStatusCodeTooltip = (code: number | undefined): string => {
    if (code === undefined) return 'Status code not specified';
    
    const statusMap: Record<number, string> = {
      0: 'OK (0) - The operation completed successfully',
      1: 'ERROR (1) - The operation ended with an error',
      2: 'UNSET (2) - The status is unset',
    };
    
    return statusMap[code] || `Unknown status code: ${code}`;
  };

  const getStatusCodeColor = (code: number | undefined): string => {
    if (code === undefined) return 'bg-gray-100 text-gray-600 border-gray-200';
    
    const colorMap: Record<number, string> = {
      0: 'bg-green-100 text-green-800 border-green-200',
      1: 'bg-red-100 text-red-800 border-red-200',
      2: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    
    return colorMap[code] || 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto py-8 px-4">
        {/* Header with Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Trace Details</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Trace Details
          </button>
          <button
            onClick={() => setActiveTab('spans')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'spans'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Spans ({spans.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-gray-600">Loading trace details...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-red-600">Error: {error}</div>
          </div>
        ) : activeTab === 'details' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {trace && (
              <div className="space-y-6">
                {/* Main Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide block mb-2">
                      Trace ID
                    </label>
                    <p className="text-sm font-mono text-blue-900 break-all">{trace.traceId || trace._id}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-2">
                      MongoDB ID
                    </label>
                    <p className="text-sm font-mono text-gray-900 break-all">{trace._id}</p>
                  </div>
                  
                  {trace.serviceName && (
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                      <label className="text-xs font-semibold text-green-700 uppercase tracking-wide block mb-2">
                        Service Name
                      </label>
                      <p className="text-sm font-semibold text-green-900">{trace.serviceName}</p>
                    </div>
                  )}
                  
                  {trace.startTime && (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                      <label className="text-xs font-semibold text-purple-700 uppercase tracking-wide block mb-2">
                        Start Time
                      </label>
                      <p className="text-sm text-purple-900">{formatDate(trace.startTime)}</p>
                    </div>
                  )}
                  
                  {trace.endTime && (
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                      <label className="text-xs font-semibold text-orange-700 uppercase tracking-wide block mb-2">
                        End Time
                      </label>
                      <p className="text-sm text-orange-900">{formatDate(trace.endTime)}</p>
                    </div>
                  )}
                  
                  {trace.startTime && trace.endTime && (
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                      <label className="text-xs font-semibold text-indigo-700 uppercase tracking-wide block mb-2">
                        Duration
                      </label>
                      <p className="text-lg font-bold text-indigo-900">
                        {formatDuration(trace.startTime, trace.endTime)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Trace Metadata Table */}
                {Object.keys(trace).filter(key => 
                  !['_id', 'traceId', 'serviceName', 'startTime', 'endTime'].includes(key) && 
                  trace[key] !== null && 
                  trace[key] !== undefined
                ).length > 0 && (
                  <div className="mt-6">
                    <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 block">
                      Trace Metadata
                    </label>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                Key
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                Value
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {Object.entries(trace)
                              .filter(([key]) => !['_id', 'traceId', 'serviceName', 'startTime', 'endTime'].includes(key))
                              .map(([key, value]) => (
                                <tr key={key} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className="text-xs font-medium text-gray-900">
                                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-xs text-gray-900 break-words">
                                      {typeof value === 'object' && value !== null ? (
                                        <pre className="font-mono bg-gray-50 p-2 rounded border border-gray-200 overflow-x-auto">
                                          {JSON.stringify(value, null, 2)}
                                        </pre>
                                      ) : (
                                        <span className="font-mono">{String(value)}</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Full Trace Data (Collapsible) */}
                <div className="mt-6">
                  <details className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
                      View Full Trace Data (JSON)
                    </summary>
                    <div className="p-4 bg-white border-t border-gray-200">
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-xs font-mono">
                        {JSON.stringify(trace, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {spans.length === 0 ? (
              <div className="text-center py-12 text-gray-600">No spans found for this trace</div>
            ) : (
              <>
                {/* Table View */}
                <div className="overflow-x-auto mb-6">
                  <table className="min-w-full bg-white border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-300">
                          Span ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-300">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-300">
                          Kind
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-300">
                          Service
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-300">
                          Duration
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-300">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {spans.map((span: Span, index: number) => (
                        <tr key={`${span._id || span.spanId || 'span'}-${index}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            <span className="font-mono text-xs">{span.spanId || span._id}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {span.name || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {span.kind !== undefined ? (
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border ${getKindColor(span.kind)} cursor-help`}
                                title={getKindTooltip(span.kind)}
                              >
                                {formatKind(span.kind)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {span.serviceName || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDuration(span.startTime, span.endTime, span.duration)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {span.status && span.status.code !== undefined ? (
                              <div className="flex flex-col gap-1">
                                <span 
                                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold border ${getStatusCodeColor(span.status.code)} cursor-help`}
                                  title={getStatusCodeTooltip(span.status.code)}
                                >
                                  {span.status.code} - {formatStatusCode(span.status.code)}
                                </span>
                                {span.status.message && (
                                  <span className="text-xs text-gray-500">{span.status.message}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Detailed Card View (expandable) */}
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 mb-4">
                    View Detailed Span Information
                  </summary>
                  <div className="space-y-4 mt-4">
                    {spans.map((span: Span, index: number) => (
                  <div
                    key={`${span._id || span.spanId || 'span'}-${index}`}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">Span ID</label>
                        <p className="text-sm text-gray-900">{span.spanId || span._id}</p>
                      </div>
                      {span.parentSpanId && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">Parent Span ID</label>
                          <p className="text-sm text-gray-900">{span.parentSpanId}</p>
                        </div>
                      )}
                      {span.name && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">Name</label>
                          <p className="text-sm text-gray-900">{span.name}</p>
                        </div>
                      )}
                      {span.serviceName && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">Service Name</label>
                          <p className="text-sm text-gray-900">{span.serviceName}</p>
                        </div>
                      )}
                      {span.startTime && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">Start Time</label>
                          <p className="text-sm text-gray-900">{formatDate(span.startTime)}</p>
                        </div>
                      )}
                      {span.endTime && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">End Time</label>
                          <p className="text-sm text-gray-900">{formatDate(span.endTime)}</p>
                        </div>
                      )}
                      {(span.duration !== undefined || (span.startTime && span.endTime)) && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">Duration</label>
                          <p className="text-sm text-gray-900">
                            {formatDuration(span.startTime, span.endTime, span.duration)}
                          </p>
                        </div>
                      )}
                      {span.kind !== undefined && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">Kind</label>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border ${getKindColor(span.kind)} cursor-help`}
                            title={getKindTooltip(span.kind)}
                          >
                            {formatKind(span.kind)}
                          </span>
                        </div>
                      )}
                      {span.status && (
                        <div>
                          <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
                          <div className="flex items-center gap-2">
                            {span.status.code !== undefined ? (
                              <span 
                                className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border ${getStatusCodeColor(span.status.code)} cursor-help`}
                                title={getStatusCodeTooltip(span.status.code)}
                              >
                                {span.status.code} - {formatStatusCode(span.status.code)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-900">-</span>
                            )}
                            {span.status.message && (
                              <span className="text-xs text-gray-600">({span.status.message})</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Attributes */}
                    {span.attributes && Array.isArray(span.attributes) && span.attributes.length > 0 && (
                      <div className="mt-4">
                        <label className="text-xs font-medium text-gray-500 block mb-3">
                          Attributes ({span.attributes.length})
                        </label>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <div className="overflow-x-auto max-h-96 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                    Key
                                  </th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200">
                                    Value
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {span.attributes.map((attr: any, attrIndex: number) => {
                                  const key = attr.key || attrIndex;
                                  const value = typeof attr.value === 'object' 
                                    ? JSON.stringify(attr.value) 
                                    : String(attr.value || '-');
                                  
                                  const isHttp = key.startsWith('http.');
                                  const isStatus = key === 'http.status_code';
                                  const isMethod = key === 'http.method';
                                  const isUrl = key === 'http.url';
                                  
                                  const getHttpStatusColor = (status: number) => {
                                    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800 border-green-200';
                                    if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-800 border-blue-200';
                                    if (status >= 400 && status < 500) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                                    if (status >= 500) return 'bg-red-100 text-red-800 border-red-200';
                                    return 'bg-gray-100 text-gray-800 border-gray-200';
                                  };
                                  
                                  const getMethodColor = (method: string) => {
                                    const methodUpper = method.toUpperCase();
                                    if (methodUpper === 'GET') return 'bg-blue-100 text-blue-800 border-blue-200';
                                    if (methodUpper === 'POST') return 'bg-green-100 text-green-800 border-green-200';
                                    if (methodUpper === 'PUT' || methodUpper === 'PATCH') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                                    if (methodUpper === 'DELETE') return 'bg-red-100 text-red-800 border-red-200';
                                    return 'bg-gray-100 text-gray-800 border-gray-200';
                                  };
                                  
                                  return (
                                    <tr key={attrIndex} className="hover:bg-gray-50">
                                      <td className="px-4 py-2 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium text-gray-900">
                                            {key}
                                          </span>
                                          {isHttp && (
                                            <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                                              HTTP
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="text-xs text-gray-900 break-words">
                                          {isStatus ? (
                                            <span className={`inline-flex items-center px-2 py-1 rounded font-semibold border ${getHttpStatusColor(Number(value))}`}>
                                              {value}
                                            </span>
                                          ) : isMethod ? (
                                            <span className={`inline-flex items-center px-2 py-1 rounded font-semibold border ${getMethodColor(value)}`}>
                                              {value}
                                            </span>
                                          ) : isUrl ? (
                                            <a
                                              href={value}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                                            >
                                              {value}
                                            </a>
                                          ) : (
                                            <span className="font-mono break-all">{value}</span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Resource */}
                    {span.resource && (
                      <div className="mt-4">
                        <label className="text-xs font-medium text-gray-500 block mb-2">Resource</label>
                        <pre className="bg-gray-50 p-3 rounded-md overflow-x-auto text-xs border border-gray-200">
                          {JSON.stringify(span.resource, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Events */}
                    {span.events && Array.isArray(span.events) && span.events.length > 0 && (
                      <div className="mt-4">
                        <label className="text-xs font-medium text-gray-500 block mb-2">Events</label>
                        <pre className="bg-gray-50 p-3 rounded-md overflow-x-auto text-xs border border-gray-200">
                          {JSON.stringify(span.events, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Full Span Data */}
                    <div className="mt-4">
                      <details className="cursor-pointer">
                        <summary className="text-xs font-medium text-gray-500 hover:text-gray-700">
                          View Full Span Data
                        </summary>
                        <pre className="mt-2 bg-gray-50 p-3 rounded-md overflow-x-auto text-xs border border-gray-200">
                          {JSON.stringify(span, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                ))}
                  </div>
                </details>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
