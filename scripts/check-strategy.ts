// Self-check for strategyToText — the Phase-01 North Star → agent-context formatter.
// Run: npx tsx scripts/check-strategy.ts   (exits non-zero on failure)
import { strategyToText } from '../lib/aggregate';
import assert from 'node:assert';

// empty / undefined → no line (must not inject noise into the agent context)
assert.equal(strategyToText(undefined), '');
assert.equal(strategyToText({}), '');
assert.equal(strategyToText({ northStar: '   ' }), ''); // whitespace-only is empty

// only populated fields appear, in order, trimmed
assert.equal(strategyToText({ northStar: '  Cut ticket time 50%  ' }), 'Session strategy — North Star: Cut ticket time 50%.');
const full = strategyToText({ northStar: 'A', sponsor: 'B', valueDrivers: 'C', guardrails: 'D' });
assert.equal(full, 'Session strategy — North Star: A; sponsor: B; value drivers: C; risk guardrails: D.');

// partial: skips blanks, keeps order
assert.equal(strategyToText({ northStar: 'A', guardrails: 'D' }), 'Session strategy — North Star: A; risk guardrails: D.');

console.log('check-strategy: OK');
