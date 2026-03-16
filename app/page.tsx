import TracesTable from '@/components/TracesTable';

export default function Home() {
  return (
    <div className="min-h-screen bg-transparent font-sans">
      <main className="container mx-auto py-8">
        <TracesTable />
      </main>
    </div>
  );
}
