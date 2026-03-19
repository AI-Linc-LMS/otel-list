'use client';

import { useState } from 'react';
import QuickStats from '@/components/QuickStats';
import TracesTable from '@/components/TracesTable';

type TabId = 'stats' | 'table';

export default function DashboardTabs() {
  const [tab, setTab] = useState<TabId>('stats');

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      <main className="container mx-auto max-w-7xl py-8">
        <header className="mb-6 px-6">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">OpenTelemetry</h1>
          <p className="mt-1 text-sm text-gray-600">Dashboard and trace explorer</p>
        </header>

        <div className="px-6">
          <div
            role="tablist"
            aria-label="Dashboard sections"
            className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'stats'}
              id="tab-stats"
              aria-controls="panel-stats"
              onClick={() => setTab('stats')}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                tab === 'stats'
                  ? 'bg-slate-900 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              Quick stats
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'table'}
              id="tab-table"
              aria-controls="panel-table"
              onClick={() => setTab('table')}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
                tab === 'table'
                  ? 'bg-slate-900 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              Traces table
            </button>
          </div>
        </div>

        <div className="mt-4">
          {tab === 'stats' ? (
            <div id="panel-stats" role="tabpanel" aria-labelledby="tab-stats" className="rounded-2xl border border-gray-200/80 bg-white shadow-sm">
              <QuickStats />
            </div>
          ) : (
            <div id="panel-table" role="tabpanel" aria-labelledby="tab-table">
              <TracesTable />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
