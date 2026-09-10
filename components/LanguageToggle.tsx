'use client';

import { useLocale } from '@/lib/i18n/locale';

/** EN | 中文 pill. Drop into any page header. `tone` picks readable colors for
 *  dark (navy) vs light backgrounds. */
export default function LanguageToggle({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { locale, setLocale } = useLocale();
  const base = 'rounded-pill px-2.5 py-1 text-xs font-medium transition-colors';
  const onDark = (active: boolean) =>
    active ? 'bg-white text-cloudera-navy' : 'text-white/70 hover:text-white';
  const onLight = (active: boolean) =>
    active ? 'bg-cloudera-navy text-white' : 'text-cloudera-slate hover:text-cloudera-navy';
  const cls = tone === 'dark' ? onDark : onLight;
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label="Language">
      <button className={`${base} ${cls(locale === 'en')}`} onClick={() => setLocale('en')}>EN</button>
      <button className={`${base} ${cls(locale === 'zh')}`} onClick={() => setLocale('zh')}>中文</button>
    </div>
  );
}
