// Reference-architecture agent — drafts a first-pass architecture mapped to
// Cloudera components, per the Marigold example in the deck.

import { chatJSON } from '../llm';
import type { ArchitectureComponent } from '../workshop';

export interface ArchitectureResult {
  components: ArchitectureComponent[];
  notes: string;
}

export async function draftArchitecture(name: string, context: string): Promise<ArchitectureResult> {
  const system =
    'You are a Cloudera AI solutions architect. Draft a first-pass reference architecture for the use case, ' +
    'mapped to Cloudera building blocks. Typical components: Cloudera Data Lake (documents/structured data), ' +
    'Cloudera AI Workbench (AI apps, chat, multi-agent), Vector DB, Cloudera AI Inference (private models), ' +
    '3rd-party LLMs (OpenAI/Anthropic/Mistral), and integration/microservices. Keep it realistic.\n' +
    'Ground the components in the SPECIFIC systems named in the context (e.g. the actual ticketing tool, ' +
    'registry, or data source). Trust the process description over the (possibly ambiguous) use-case name; ' +
    'do not invent generic components that the process does not imply.';
  const user = `Use case: "${name}"

Context:
${context}

Return ONLY JSON:
{
  "components": [{"id":"<kebab-id>","label":"<component>","role":"<what it does here>"}],
  "notes": "<2-3 sentences on data flow and how the pieces connect>"
}`;

  return chatJSON<ArchitectureResult>([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
}
