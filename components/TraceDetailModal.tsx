'use client';

import { useState, useEffect, useCallback } from 'react';
import { tracesApi, Trace, Span } from '@/lib/api/traces';

interface TraceDetailModalProps {
  traceId: string;
  traceMongoId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TraceDetailModal({
  traceId,
  traceMongoId,
  isOpen,
  onClose,
}: TraceDetailModalProps) {
  const [trace, setTrace] = useState<Trace | null>(null);
  const [spans, setSpans] = useState<Span[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'spans'>('details');

  const fetchTraceDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch trace by MongoDB _id
      const traceData = await tracesApi.getTraceById(traceMongoId);
      setTrace(traceData);
      
      // Fetch spans by traceId
      const spansData = await tracesApi.getTraceSpans(traceId);
      setSpans(spansData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch trace details');
      console.error('Error fetching trace details:', err);
    } finally {
      setLoading(false);
    }
  }, [traceMongoId, traceId]);

  useEffect(() => {
    if (isOpen && traceMongoId) {
      fetchTraceDetails();
    }
  }, [isOpen, traceMongoId, fetchTraceDetails]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Trace Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
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
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-lg text-gray-600">Loading trace details...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-lg text-red-600">Error: {error}</div>
            </div>
          ) : activeTab === 'details' ? (
            <div className="space-y-4">
              {trace && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Trace ID</label>
                      <p className="mt-1 text-sm text-gray-900">{trace.traceId || trace._id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">MongoDB ID</label>
                      <p className="mt-1 text-sm text-gray-900">{trace._id}</p>
                    </div>
                    {trace.serviceName && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Service Name</label>
                        <p className="mt-1 text-sm text-gray-900">{trace.serviceName}</p>
                      </div>
                    )}
                    {trace.startTime && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Start Time</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(trace.startTime).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {trace.endTime && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">End Time</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(trace.endTime).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {trace.startTime && trace.endTime && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Duration</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {trace.endTime - trace.startTime} ms
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Additional fields */}
                  <div className="mt-6">
                    <label className="text-sm font-medium text-gray-500 mb-2 block">
                      Additional Data
                    </label>
                    <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-xs">
                      {JSON.stringify(trace, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {spans.length === 0 ? (
                <div className="text-center py-8 text-gray-600">No spans found for this trace</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Span ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Parent Span ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Start Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          End Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {spans.map((span: Span, index: number) => (
                        <tr key={`${span._id || span.spanId || 'span'}-${index}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {span.spanId || span._id}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {span.parentSpanId || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {span.name || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {span.startTime
                              ? new Date(span.startTime).toLocaleString()
                              : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {span.endTime
                              ? new Date(span.endTime).toLocaleString()
                              : '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {span.startTime && span.endTime
                              ? `${span.endTime - span.startTime} ms`
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
