// The WorkshopPack — the editable state of an on-site discovery workshop for one
// customer. Produced by the pre-session agent pass (see lib/agents/), edited live
// by the facilitator, and exported as the leave-behind.
//
// The whole pack is stored as JSON in the `workshops` table (1:1 with a survey
// slug). Facilitator edits are just patches to this object.

/** The deck's scoring rubric — Business Value + Technical Feasibility, each 1/3/5. */
export interface UseCaseScores {
  // Business Value ("the Why")
  strategicAlignment: number; // 1 | 3 | 5
  frequencyVolume: number;
  potentialRoi: number;
  userExperience: number;
  // Technical Feasibility ("the How")
  dataAvailability: number;
  toleranceForError: number;
  complexityOfLogic: number;
  integrationEase: number;
}

/** The AI Canvas — 7 fields per the deck. */
export interface AiCanvas {
  prediction: string;
  judgment: string;
  action: string;
  outcome: string;
  training: string;
  input: string;
  feedback: string;
}

export interface WorkshopUseCase {
  id: string;
  name: string;
  summary: string; // 1-2 line description
  source: 'survey' | 'workshop'; // promoted from survey, or added live
  context?: string; // original survey-derived context (reused by on-demand assists)
  scores: UseCaseScores;
  rationale?: string; // one-line scoring rationale from the prioritize agent
  /** Normalized 0..1 matrix coordinates derived from scores; facilitator can drag. */
  matrix: { value: number; feasibility: number };
  canvas?: AiCanvas;
  killIdea?: string; // devil's-advocate note
  // Carried over from the survey where available:
  pattern?: string[]; // uc_pattern values
  systems?: string[]; // uc_systems values
  hitl?: string; // uc_hitl value
}

export interface ArchitectureComponent {
  id: string;
  label: string; // e.g. "Cloudera AI Workbench"
  role: string; // what it does in this use case
}

export interface RaciEntry {
  task: string;
  responsible: string;
  accountable: string;
  consulted: string;
  informed: string;
}

export interface BacklogItem {
  useCaseId: string;
  mvp: string; // the MVP definition
  nextSteps: string;
}

// Facilitator-entered "session signals" — the desired solution patterns, systems, and
// human-in-the-loop stance, captured live on the Dashboard when the survey didn't collect them.
// These also guide the AI (fed into the canvas/architecture/kill context).
export interface SessionSignals {
  patterns?: string[]; // uc_pattern option values
  systems?: string[]; // uc_systems option values
  hitl?: string[]; // uc_hitl option values
}

export interface WorkshopPack {
  useCases: WorkshopUseCase[];
  architecture: { forUseCaseId?: string; components: ArchitectureComponent[]; notes: string } | null;
  roadmap: { backlog: BacklogItem[]; raci: RaciEntry[] } | null;
  signals?: SessionSignals;
  generatedAt?: string;
}

export function emptyPack(): WorkshopPack {
  return { useCases: [], architecture: null, roadmap: null };
}

/** Map the 8 rubric scores (1/3/5) to normalized 0..1 matrix coordinates. */
export function scoresToMatrix(s: UseCaseScores): { value: number; feasibility: number } {
  const norm = (a: number, b: number, c: number, d: number) => {
    const avg = (a + b + c + d) / 4; // 1..5
    return Math.max(0, Math.min(1, (avg - 1) / 4));
  };
  return {
    value: norm(s.strategicAlignment, s.frequencyVolume, s.potentialRoi, s.userExperience),
    feasibility: norm(s.dataAvailability, s.toleranceForError, s.complexityOfLogic, s.integrationEase),
  };
}
