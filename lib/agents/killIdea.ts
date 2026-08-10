// Devil's-advocate agent — the deck's "Kill the Idea" exercise. Argues why a use
// case won't work, to build robustness before committing.

import { chat } from '../llm';

export async function killIdea(name: string, context: string): Promise<string> {
  const system =
    'You are a skeptical senior engineer running the "Kill the Idea" exercise in a discovery workshop. ' +
    'Give the strongest, most specific reasons this AI use case might FAIL — data gaps, adoption, accuracy ' +
    'requirements, integration cost, change management. Be blunt and concrete, not generic.\n' +
    'Ground every risk in the SPECIFIC process/systems described in the context (name them). Reject generic ' +
    'risks that could apply to any AI project; trust the process description over the (possibly ambiguous) name.';
  const user = `Use case: "${name}"

Context:
${context}

List the top 3 reasons this could fail, as short bullet points. End with one sentence on what would most reduce the risk.`;

  return chat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.5, maxTokens: 500 },
  );
}
