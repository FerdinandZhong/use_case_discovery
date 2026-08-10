import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="bg-cloudera-navy text-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="text-cloudera-orange font-bold tracking-widest text-sm">CLOUDERA</div>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">AI Use Case Discovery</h1>
          <p className="mt-4 text-lg text-white/80">
            The pre-discovery survey that seeds our AI Use Case Discovery Workshop. It helps us
            identify the friction, gauge your data readiness, and prioritize the use cases that
            matter most — before we ever step into the room.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-large border border-surface-border bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold">Have a survey link?</h2>
          <p className="mt-2 text-cloudera-slate">
            Your Cloudera contact will share a personalized link that looks like{' '}
            <code className="rounded bg-surface-light px-1.5 py-0.5 text-sm">/s/your-company</code>.
            Open it to begin — you can save your progress and return anytime.
          </p>
        </div>

        <div className="mt-6 rounded-large border border-surface-border bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold">Running the workshop?</h2>
          <p className="mt-2 text-cloudera-slate">
            Head to the{' '}
            <Link href="/admin" className="font-medium text-cloudera-orange underline">
              admin dashboard
            </Link>{' '}
            to create a customer survey link and collect responses into catalogs.
          </p>
        </div>
      </section>
    </main>
  );
}
