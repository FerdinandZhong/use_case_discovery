// Self-check for the deck-filter logic. Run: npx tsx scripts/check-deck.ts
import assert from 'node:assert';
import { deckSections } from '../lib/questionnaire';

const sections = deckSections();
const ids = sections.map((s) => s.id);
const allQ = sections.flatMap((s) => s.questions);
const qids = allQ.map((q) => q.id);

// The four discovery topics must be present.
assert(ids.includes('friction'), 'deck must include challenges (friction)');
assert(ids.includes('platform'), 'deck must include platform & tools');
assert(ids.includes('data_readiness'), 'deck must include data readiness');

// The two new questions must be present.
assert(qids.includes('current_platform'), 'deck must ask current_platform');
assert(qids.includes('tools_stack'), 'deck must ask tools_stack');

// No long free-text in the deck.
const textareas = allQ.filter((q) => q.type === 'textarea');
assert(textareas.length === 0, `deck must drop textareas, found: ${textareas.map((q) => q.id).join(', ')}`);

// Every included question is genuinely deck-flagged.
assert(allQ.every((q) => q.deck === true), 'deckSections must only include deck-flagged questions');

console.log(`OK — deck has ${sections.length} slides, ${qids.length} questions:`, qids.join(', '));
