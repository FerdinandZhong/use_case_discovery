'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Aggregate, Bucket } from '@/lib/aggregate';
import type { SessionSignals } from '@/lib/workshop';
import { QUESTIONNAIRE, optionLabel, Question } from '@/lib/questionnaire';

const NAVY = '#1a1a4e';
const ORANGE = '#EA2A0C';

function ChartCard({ title, data, color = NAVY }: { title: string; data: Bucket[]; color?: string }) {
  const rows = data.filter((d) => d.count > 0);
  return (
    <div className="rounded-large border border-surface-border bg-white p-5 shadow-card">
      <h3 className="font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-cloudera-slate">No data yet.</p>
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
  const q = ucQuestion(questionId);
  const opts = q?.options ?? [];
  // "on" = explicit override includes it, or (no override yet) survey has it
  const current = selected ?? surveyKeys;
  const isOn = (v: string) => current.includes(v);
  function toggle(v: string) {
    const base = selected ?? surveyKeys; // first edit seeds from survey
    onChange(isOn(v) ? base.filter((x) => x !== v) : [...base, v]);
  }
  return (
    <div className="rounded-large border border-surface-border bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-cloudera-slate">{selected ? 'edited' : surveyKeys.length ? 'from survey' : 'tap to set'}</span>
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
            {optionLabel(q as Question, o.value)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({
  agg,
  signals,
  onEditSignals,
}: {
  agg: Aggregate;
  signals?: SessionSignals;
  onEditSignals: (s: SessionSignals) => void;
}) {
  const keysOf = (b: Bucket[]) => b.filter((x) => x.count > 0).map((x) => x.key);
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Respondents" value={agg.respondentCount} />
        <Stat label="Candidate use cases" value={agg.useCaseCount} />
        <Stat label="Distinct value drivers" value={agg.valueDrivers.filter((b) => b.count).length} />
        <Stat label="Systems in scope" value={(signals?.systems ?? keysOf(agg.ucSystems)).length} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Primary value drivers" data={agg.valueDrivers} color={ORANGE} />
        <ChartCard title="Biggest blockers" data={agg.bottlenecks} />
        <ChartCard title="Current platform" data={agg.platforms} />
        <ChartCard title="Tools in use" data={agg.tools} />
        <ChartCard title="Where the data lives" data={agg.dataFormats} />
        <ChartCard title="Data trust (1–5)" data={agg.dataQuality} color={ORANGE} />
        {/* Editable: often skipped in the survey — set them live; they also guide the AI canvas. */}
        <SignalCard
          title="Solution patterns wanted"
          questionId="uc_pattern"
          surveyKeys={keysOf(agg.ucPatterns)}
          selected={signals?.patterns}
          onChange={(patterns) => onEditSignals({ ...signals, patterns })}
        />
        <SignalCard
          title="Systems to integrate"
          questionId="uc_systems"
          surveyKeys={keysOf(agg.ucSystems)}
          selected={signals?.systems}
          onChange={(systems) => onEditSignals({ ...signals, systems })}
        />
        <SignalCard
          title="Human-in-the-loop expectation"
          questionId="uc_hitl"
          surveyKeys={keysOf(agg.ucHitl)}
          selected={signals?.hitl}
          onChange={(hitl) => onEditSignals({ ...signals, hitl })}
        />
        <ChartCard title="Risk tolerance" data={agg.riskTolerance} color={ORANGE} />
      </div>
      <p className="mt-3 text-sm text-cloudera-slate">
        The three editable cards let you capture solution pattern, systems, and human-in-the-loop live when the
        survey didn’t — they also guide the AI when you generate or re-draft the canvas.
      </p>
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
