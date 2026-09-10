'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n/locale';
import LanguageToggle from '@/components/LanguageToggle';

export default function Home() {
  const t = useT();
  return (
    <main className="min-h-screen">
      <header className="bg-cloudera-navy text-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="flex items-start justify-between">
            <div className="text-cloudera-orange font-bold tracking-widest text-sm">CLOUDERA</div>
            <LanguageToggle tone="dark" />
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">{t('brand.name')}</h1>
          <p className="mt-4 text-lg text-white/80">{t('home.lede')}</p>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-large border border-surface-border bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold">{t('home.haveLink.title')}</h2>
          <p className="mt-2 text-cloudera-slate">
            {t('home.haveLink.pre')}{' '}
            <code className="rounded bg-surface-light px-1.5 py-0.5 text-sm">/s/your-company</code>
            {t('home.haveLink.post')}
          </p>
        </div>

        <div className="mt-6 rounded-large border border-surface-border bg-white p-6 shadow-card">
          <h2 className="text-xl font-semibold">{t('home.workshop.title')}</h2>
          <p className="mt-2 text-cloudera-slate">
            {t('home.workshop.pre')}{' '}
            <Link href="/admin" className="font-medium text-cloudera-orange underline">
              {t('home.workshop.link')}
            </Link>{' '}
            {t('home.workshop.post')}
          </p>
        </div>
      </section>
    </main>
  );
}
