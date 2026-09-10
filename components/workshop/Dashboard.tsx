'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Aggregate, Bucket } from '@/lib/aggregate';
import type { SessionSignals, Strategy } from '@/lib/workshop';
import { QUESTIONNAIRE, Question } from '@/lib/questionnaire';
import { useLocale, useT } from '@/lib/i18n/locale';
import { localizedOptionLabel } from '@/lib/i18n/questionnaire-zh';

const NAVY = '#1a1a4e';
const ORANGE = '#EA2A0C';

function ChartCard({ title, data, color = NAVY }: { title: string; data: Bucket[]; color?: string }) {
  const t = useT();
  const rows = data.filter((d) => d.count > 0);
  return (
    <div className="rounded-large border border-surface-border bg-white p-5 shadow-card">
      <h3 className="font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-cloudera-slate">{t('dash.noData')}</p>
      ) : (
        <div className="mt-3" style={{ height: Math.max(120, rows.length * 38) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis type="category" dataKey="label" width={190} tick={{ fontSize: 13, fill: NAVY }} interval={0} />
              <Tooltip cursor={{ fill: '#f6f6f9' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {rows.map((_, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ucQuestion(id: string): Question | undefined {
  return QUESTIONNAIRE.sections.find((s) => s.id === 'use_cases')?.questions.find((q) => q.id === id);
}

/** Editable chip card — facilitator can set these signals live, seeded from any survey data. */
function SignalCard({
  title,
  questionId,
  surveyKeys,
  selected,
  onChange,
}: {
  title: string;
  questionId: string;
  surveyKeys: string[]; // option values present in survey responses
  selected: string[] | undefined; // facilitator override (undefined = not yet edited)
  onChange: (next: string[]) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const q = ucQuestion(questionId);
  const opts = q?.options ?? [];
  const current = selected ?? surveyKeys;
  const isOn = (v: string) => current.includes(v);
  function toggle(v: string) {
    const base = selected ?? surveyKeys;
    onChange(isOn(v) ? base.filter((x) => x !== v) : [...base, v]);
  }
  return (
    <div className="rounded-large border border-surface-border bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-cloudera-slate">
          {selected ? t('dash.signal.edited') : surveyKeys.length ? t('dash.signal.fromSurvey') : t('dash.signal.tapToSet')}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {opts.map((o) => (
          <button
            key={o.value}
            onClick={() => toggle(o.value)}
            className={`rounded-pill border px-3 py-1 text-sm ${
              isOn(o.value)
                ? 'border-cloudera-orange bg-cloudera-orange text-white'
                : 'border-surface-border bg-white text-cloudera-navy hover:border-cloudera-orange'
            }`}
          >
            {localizedOptionLabel(q as Question, o.value, locale)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Phase-01 North Star capture — free text, seeded empty; guides the AI + export. */
function StrategyCard({ strategy, onChange }: { strategy?: Strategy; onChange: (s: Strategy) => void }) {
  const t = useT();
  const s = strategy ?? {};
  const set = (k: keyof Strategy, v: string) => onChange({ ...s, [k]: v });
  const edited = !!(s.northStar || s.sponsor || s.valueDrivers || s.guardrails);
  return (
    <div className="rounded-large border border-surface-border bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('dash.strategy.title')}</h3>
        <span className="text-xs text-cloudera-slate">{edited ? t('dash.signal.edited') : t('dash.strategy.badge.set')}</span>
      </div>
      <textarea
        value={s.northStar ?? ''}
        onChange={(e) => set('northStar', e.target.value)}
        rows={2}
        placeholder={t('dash.strategy.northStar.placeholder')}
        className="mt-3 w-full rounded-standard border border-surface-border px-3 py-2 text-sm outline-none focus:border-cloudera-orange"
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label={t('dash.strategy.sponsor')} value={s.sponsor} onChange={(v) => set('sponsor', v)} placeholder={t('dash.strategy.sponsor.placeholder')} />
        <Field label={t('dash.strategy.valueDrivers')} value={s.valueDrivers} onChange={(v) => set('valueDrivers', v)} placeholder={t('dash.strategy.valueDrivers.placeholder')} />
        <Field label={t('dash.strategy.guardrails')} value={s.guardrails} onChange={(v) => set('guardrails', v)} placeholder={t('dash.strategy.guardrails.placeholder')} />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-cloudera-slate">{label}</span>
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-standard border border-surface-border px-3 py-2 text-sm outline-none focus:border-cloudera-orange"
      />
    </label>
  );
}

export default function Dashboard({
  agg,
  signals,
  onEditSignals,
  strategy,
  onEditStrategy,
}: {
  agg: Aggregate;
  signals?: SessionSignals;
  onEditSignals: (s: SessionSignals) => void;
  strategy?: Strategy;
  onEditStrategy: (s: Strategy) => void;
}) {
  const t = useT();
  const keysOf = (b: Bucket[]) => b.filter((x) => x.count > 0).map((x) => x.key);
  return (
    <div>
      {/* Phase 01 · Strategy & Alignment — capture the North Star live (esp. no-survey rooms). */}
      <StrategyCard strategy={strategy} onChange={onEditStrategy} />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label={t('dash.stat.respondents')} value={agg.respondentCount} />
        <Stat label={t('dash.stat.candidateUseCases')} value={agg.useCaseCount} />
        <Stat label={t('dash.stat.valueDrivers')} value={agg.valueDrivers.filter((b) => b.count).length} />
        <Stat label={t('dash.stat.systemsInScope')} value={(signals?.systems ?? keysOf(agg.ucSystems)).length} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('dash.chart.valueDrivers')} data={agg.valueDrivers} color={ORANGE} />
        <ChartCard title={t('dash.chart.blockers')} data={agg.bottlenecks} />
        <ChartCard title={t('dash.chart.platform')} data={agg.platforms} />
        <ChartCard title={t('dash.chart.tools')} data={agg.tools} />
        <ChartCard title={t('dash.chart.dataFormats')} data={agg.dataFormats} />
        <ChartCard title={t('dash.chart.dataTrust')} data={agg.dataQuality} color={ORANGE} />
        {/* Editable: often skipped in the survey — set them live; they also guide the AI canvas. */}
        <SignalCard
          title={t('dash.signal.patterns')}
          questionId="uc_pattern"
          surveyKeys={keysOf(agg.ucPatterns)}
          selected={signals?.patterns}
          onChange={(patterns) => onEditSignals({ ...signals, patterns })}
        />
        <SignalCard
          title={t('dash.signal.systems')}
          questionId="uc_systems"
          surveyKeys={keysOf(agg.ucSystems)}
          selected={signals?.systems}
          onChange={(systems) => onEditSignals({ ...signals, systems })}
        />
        <SignalCard
          title={t('dash.signal.hitl')}
          questionId="uc_hitl"
          surveyKeys={keysOf(agg.ucHitl)}
          selected={signals?.hitl}
          onChange={(hitl) => onEditSignals({ ...signals, hitl })}
        />
        <ChartCard title={t('dash.chart.riskTolerance')} data={agg.riskTolerance} color={ORANGE} />
      </div>
      <p className="mt-3 text-sm text-cloudera-slate">{t('dash.footer')}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-large border border-surface-border bg-white p-4 shadow-card">
      <div className="text-3xl font-semibold text-cloudera-navy">{value}</div>
      <div className="mt-1 text-sm text-cloudera-slate">{label}</div>
    </div>
  );
}
