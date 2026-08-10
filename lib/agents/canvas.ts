// AI Canvas agent — drafts the deck's 7-field AI Canvas for one use case.

import { chatJSON } from '../llm';
import type { AiCanvas } from '../workshop';

export async function draftCanvas(name: string, context: string): Promise<AiCanvas> {
  const system =
    'You are an AI solutions architect filling out "The AI Canvas" for ONE specific business process ' +
    'in a Cloudera discovery workshop. Be concrete and concise (1-3 sentences per field).\n' +
    'CRITICAL grounding rules:\n' +
    '- Anchor every field in the SPECIFIC process described in the context — its real inputs, decisions, ' +
    'systems, actors, and outcomes. Name them.\n' +
    "- Do NOT produce generic AI-assistant boilerplate (e.g. \"retrieve information\", \"user queries\", " +
    '"user satisfaction", "misinformation"). If you find yourself writing those, you have misread the process.\n' +
    '- The use-case NAME may be ambiguous — trust the process description, not the name.\n' +
    '- If the process is a multi-step workflow with approvals, PREDICTION is the routing/risk/approval ' +
    'decision (which items are safe to auto-handle vs. need review), and ACTION is the concrete steps the ' +
    'agent performs across the named tools/systems.';
  const user = `Fill the AI Canvas, grounded strictly in this process.

USE CASE: "${name}"

PROCESS & CONTEXT (this is the source of truth — every field must reflect it):
${context}

Return ONLY JSON with these 7 fields, each specific to the process above:
{
  "prediction": "The key decision/uncertainty the AI resolves FOR THIS PROCESS (often a routing/risk/approval call).",
  "judgment": "Payoff of right vs wrong FOR THIS PROCESS — name the concrete cost of a false positive vs false negative.",
  "action": "The concrete actions the AI/agent takes across the named systems, incl. the human-in-the-loop gate.",
  "outcome": "How success is measured here (e.g. straight-through rate, time-to-X, errors caught) — process-specific metrics.",
  "training": "The actual historical inputs/actions/outcomes from THIS process that train the model.",
  "input": "The real data fed in at run time for THIS process.",
  "feedback": "How outcomes from THIS process are captured to improve the model."
}`;

  return chatJSON<AiCanvas>([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
}
