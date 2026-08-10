// The pre-discovery questionnaire, defined once as data.
//
// Content is drawn directly from the "AI Discovery Workshop" deck
// (Pre-Discovery Homework slides, Workshop Participants profile, and the
// "Kill the Idea" prompt). Rendering, autosave, and catalog mapping all derive
// from this single source of truth — adding a customer requires no code change.

export type QuestionType =
  | 'text' // single-line free text
  | 'textarea' // multi-line free text
  | 'single' // pick one option
  | 'multi' // pick many options
  | 'scale'; // 1-5 rating

export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  help?: string;
  required?: boolean;
  options?: QuestionOption[]; // for single / multi
  scaleLabels?: { min: string; max: string }; // for scale
  placeholder?: string;
  /** Shown in the sales-driven "deck" presentation (/d/[slug]). Full survey ignores this. */
  deck?: boolean;
  /** Shorter, punchier label to use in the deck (falls back to `label`). */
  deckLabel?: string;
}

export interface Section {
  id: string;
  title: string;
  subtitle?: string;
  intro?: string;
  questions: Question[];
  /**
   * When true, the respondent can add multiple entries of this section
   * (used for per-use-case "Problem Mining"). Each entry is stored as an
   * object keyed by question id inside an array.
   */
  repeatable?: boolean;
  repeatLabel?: string; // e.g. "Use case"
}

export interface Questionnaire {
  version: string;
  sections: Section[];
}

export const ROLE_OPTIONS: QuestionOption[] = [
  { value: 'exec_sponsor', label: 'Executive Sponsor' },
  { value: 'business_sme', label: 'Product / Business Owner (SME)' },
  { value: 'it_data_architect', label: 'IT / Data Architect' },
  { value: 'end_user', label: 'End User' },
  { value: 'other', label: 'Other' },
];

export const QUESTIONNAIRE: Questionnaire = {
  version: '2026-07-30',
  sections: [
    {
      id: 'profile',
      title: 'About You',
      subtitle: 'So we bring the right perspective into the workshop.',
      questions: [
        { id: 'name', type: 'text', label: 'Your name', required: true, placeholder: 'Jane Doe', deck: true, deckLabel: 'Who are we talking to?' },
        { id: 'email', type: 'text', label: 'Work email', placeholder: 'jane@company.com' },
        {
          id: 'role',
          type: 'single',
          label: 'Which best describes your role?',
          required: true,
          deck: true,
          deckLabel: 'Their role',
          options: ROLE_OPTIONS,
          help: 'Executive sponsors set the North Star; SMEs know the day-to-day pain; architects flag data/security; end users tell us what is adoptable.',
        },
        { id: 'department', type: 'text', label: 'Team / department', placeholder: 'e.g. SRE, Finance Operations' },
      ],
    },
    {
      id: 'friction',
      title: 'Identify the Friction',
      subtitle: 'Pain points where AI typically excels — repetition, data overload, poor prediction.',
      questions: [
        {
          id: 'core_process',
          type: 'textarea',
          label:
            'Identify one core process in your team that consumes at least 20% of weekly manual effort.',
          help: 'Examples: categorizing emails, extracting data from PDFs, summarizing reports, verifying invoices — or a multi-step internal workflow (e.g. model-pull request: raise a Jira ticket → manual approval → enter details → MLE executes).',
          required: true,
        },
        {
          id: 'bottleneck',
          type: 'multi',
          label: 'In that process, what is the primary "blocker"?',
          deck: true,
          deckLabel: 'Where does the work get stuck?',
          options: [
            { value: 'approval', label: 'Waiting for human approval / review (approval gates)' },
            { value: 'handoffs', label: 'Manual handoffs between people or teams' },
            { value: 'swivel_chair', label: 'Swivel-chair work — copy/paste across tools (Jira, ERP, CI/CD, wikis)' },
            { value: 'ticketing', label: 'Repetitive ticket creation, triage, or routing' },
            { value: 'queue', label: 'Waiting in a queue for a specialist to act' },
            { value: 'disparate_data', label: 'Accessing data from multiple disparate systems' },
            { value: 'dirty_data', label: 'Cleaning or formatting inconsistent data' },
            { value: 'specialized', label: 'Complex decision-making requiring specialized knowledge' },
          ],
        },
        {
          id: 'if_only_knew',
          type: 'textarea',
          label:
            'If you could predict ONE business variable with 90% accuracy, which one would change your strategy the most?',
          help: 'e.g. customer churn, equipment failure, next month’s demand.',
        },
      ],
    },
    {
      id: 'platform',
      title: 'Platform & Tooling',
      subtitle: 'What they run on today, and the tools an AI solution would sit alongside.',
      questions: [
        {
          id: 'current_platform',
          type: 'multi',
          label: 'What data / cloud platform do you run on today? (Select all that apply)',
          deck: true,
          deckLabel: 'What do you run on today?',
          options: [
            { value: 'cloudera', label: 'Cloudera (CDP / CDH)' },
            { value: 'snowflake', label: 'Snowflake' },
            { value: 'databricks', label: 'Databricks' },
            { value: 'aws', label: 'AWS (native services)' },
            { value: 'azure', label: 'Azure (native services)' },
            { value: 'gcp', label: 'Google Cloud' },
            { value: 'hadoop_onprem', label: 'On-prem Hadoop' },
            { value: 'other_dw', label: 'Other data warehouse' },
            { value: 'spreadsheets', label: 'Mostly spreadsheets / manual' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          id: 'tools_stack',
          type: 'multi',
          label: 'Which tools does the team live in day-to-day? (Select all that apply)',
          deck: true,
          deckLabel: 'What tools do you live in?',
          options: [
            { value: 'ticketing', label: 'Jira / ServiceNow (tickets)' },
            { value: 'chat', label: 'Slack / Teams / email' },
            { value: 'scm', label: 'GitHub / GitLab (code, PRs)' },
            { value: 'cicd', label: 'CI/CD & orchestration (Jenkins, Airflow, Argo)' },
            { value: 'ml_platform', label: 'ML platform / model registry (Cloudera AI, MLflow)' },
            { value: 'erp_crm', label: 'ERP / CRM' },
            { value: 'bi', label: 'BI (Tableau, Power BI, Looker)' },
            { value: 'internal_api', label: 'Internal APIs / CLIs' },
          ],
        },
      ],
    },
    {
      id: 'data_readiness',
      title: 'Data & Tooling Readiness',
      subtitle: 'Availability of data, controls, and approvals. This is the #1 place discovery gets derailed.',
      questions: [
        {
          id: 'data_format',
          type: 'multi',
          label: 'Where does the information for this process currently live? (Select all that apply)',
          deck: true,
          deckLabel: 'Where does the data live?',
          options: [
            { value: 'structured', label: 'Structured databases (SQL, Snowflake, ERP)' },
            { value: 'unstructured', label: 'Unstructured documents (PDFs, Word, slide decks)' },
            { value: 'comms', label: 'Internal communications (Slack, email, Teams)' },
            { value: 'tribal', label: "Tribal knowledge (only lives in people's heads)" },
          ],
        },
        {
          id: 'data_quality',
          type: 'scale',
          label:
            'On a scale of 1–5, how much do you trust the accuracy and cleanliness of this data today?',
          deck: true,
          deckLabel: 'How much do you trust that data?',
          scaleLabels: { min: '1 — Total mess', max: '5 — Ready for analysis' },
        },
      ],
    },
    {
      id: 'strategic_impact',
      title: 'Strategic Impact',
      subtitle: 'Helps us prioritize across use cases — and helps you sell the project internally.',
      questions: [
        {
          id: 'value_driver',
          type: 'multi',
          label: 'If we automated or augmented this task with AI, what would be the primary win?',
          options: [
            { value: 'cost', label: 'Cost savings — reduce headcount or operational spend' },
            { value: 'velocity', label: 'Velocity — do the same task 10x faster' },
            { value: 'quality', label: 'Quality — reduce human error, increase consistency' },
            { value: 'revenue', label: 'Revenue — new product or better customer experience' },
            { value: 'toil', label: 'Toil reduction — eliminate manual handoffs & repetitive steps' },
            { value: 'cycle_time', label: 'Cycle time — cut end-to-end lead time & approval waiting' },
            { value: 'governance', label: 'Governance — consistency, traceability, auditability, compliance' },
            { value: 'self_service', label: 'Self-service — reduce dependency on specialists / ticket queues' },
          ],
        },
        {
          id: 'risk_tolerance',
          type: 'single',
          label: 'How accurate does this AI need to be for you to trust it?',
          options: [
            { value: 'low_risk', label: 'Low risk — 70% accuracy is fine (e.g. internal drafting)' },
            {
              value: 'high_risk',
              label: 'High risk — 99% accuracy required (e.g. financial reporting, legal compliance)',
            },
          ],
        },
      ],
    },
    {
      id: 'blue_sky',
      title: 'Blue Sky',
      subtitle: 'Dream a little.',
      questions: [
        {
          id: 'magic_assistant',
          type: 'textarea',
          label:
            'If you had a "magic assistant" that knew everything about your domain’s historical data and could answer any question in seconds, what is the first question you would ask it?',
        },
      ],
    },
    {
      id: 'use_cases',
      title: 'Candidate Use Cases',
      subtitle:
        'Add any specific use cases you already have in mind — including multi-step internal workflows. We’ll peel the onion on each.',
      repeatable: true,
      repeatLabel: 'Use case',
      questions: [
        { id: 'uc_name', type: 'text', label: 'Use case name', placeholder: 'e.g. Model-pull request automation' },
        {
          id: 'uc_pattern',
          type: 'multi',
          label: 'What kind of AI solution fits best? (Select all that apply)',
          help: 'How the AI would show up — a prediction, an assistant, or an agent that takes actions across tools.',
          options: [
            { value: 'prediction', label: 'Prediction / forecast (a number or likelihood)' },
            { value: 'classification', label: 'Classification / routing / triage' },
            { value: 'extraction', label: 'Document extraction / parsing' },
            { value: 'assistant', label: 'RAG assistant / natural-language Q&A over knowledge' },
            { value: 'summarization', label: 'Summarization of long content' },
            { value: 'anomaly', label: 'Anomaly detection / alerting' },
            {
              value: 'agent_workflow',
              label: 'Multi-step agent that executes actions across tools (with approvals)',
            },
          ],
        },
        {
          id: 'uc_process_steps',
          type: 'textarea',
          label: 'List the current steps end-to-end — who (or what system) does each step?',
          help: 'Capture the real workflow, including handoffs and approvals.',
          placeholder:
            'e.g. 1) Requester raises a Jira ticket  2) Lead manually approves  3) Requester enters model details  4) MLE pulls & registers the model  5) Requester notified',
        },
        {
          id: 'uc_systems',
          type: 'multi',
          label: 'Which systems / tools would the solution need to touch?',
          options: [
            { value: 'ticketing', label: 'Jira / ServiceNow (tickets)' },
            { value: 'chat', label: 'Slack / Teams / email' },
            { value: 'scm', label: 'GitHub / GitLab (code, PRs)' },
            { value: 'cicd', label: 'CI/CD & orchestration (Jenkins, Airflow, Argo)' },
            { value: 'ml_platform', label: 'ML platform / model registry (Cloudera AI, MLflow)' },
            { value: 'erp_crm', label: 'ERP / CRM' },
            { value: 'data', label: 'Databases / data warehouse' },
            { value: 'internal_api', label: 'Internal APIs / CLIs' },
          ],
        },
        {
          id: 'uc_hitl',
          type: 'single',
          label: 'Where must a human stay in the loop?',
          help: 'Especially important for workflows that take real actions.',
          options: [
            { value: 'approve_before', label: 'Approval gate — a human must approve before any action is taken' },
            { value: 'review_output', label: 'Review — a human checks/edits the AI output before it is used' },
            { value: 'exceptions', label: 'Exceptions only — human handles just the edge cases' },
            { value: 'autonomous', label: 'Fully automated — no human step needed' },
          ],
        },
        {
          id: 'uc_frequency',
          type: 'single',
          label: 'How frequently does this problem occur?',
          options: [
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'adhoc', label: 'Ad hoc' },
          ],
        },
        {
          id: 'uc_cost_of_inaction',
          type: 'textarea',
          label: 'What is the current cost of NOT solving this problem?',
        },
        {
          id: 'uc_history',
          type: 'text',
          label: 'How far back does relevant historical data go? Are labeled outcomes available?',
          placeholder: 'e.g. 2 years of tickets with resolution notes; SOPs/runbooks in Confluence',
        },
        {
          id: 'uc_compliance',
          type: 'textarea',
          label: 'Any regulatory, compliance, or audit constraints? What happens if the AI is unavailable?',
        },
        {
          id: 'uc_kill_the_idea',
          type: 'textarea',
          label: '"Kill the idea": give the strongest reason this use case WON’T work.',
          help: 'We ask this deliberately to build robustness.',
        },
      ],
    },
  ],
};

/** Flat lookup of every non-repeatable question, keyed by "sectionId.questionId". */
export function questionByPath(): Record<string, { section: Section; question: Question }> {
  const map: Record<string, { section: Section; question: Question }> = {};
  for (const section of QUESTIONNAIRE.sections) {
    for (const q of section.questions) {
      map[`${section.id}.${q.id}`] = { section, question: q };
    }
  }
  return map;
}

/** Human-readable label for a stored option value within a question. */
export function optionLabel(question: Question, value: string): string {
  return question.options?.find((o) => o.value === value)?.label ?? value;
}

/**
 * The deck view (/d/[slug]) renders the same questionnaire but only the questions
 * flagged `deck: true`, one section per slide. Sections with no deck questions are
 * dropped entirely. The full survey (/s/[slug]) ignores the flag and shows all.
 */
export function deckSections(): Section[] {
  return QUESTIONNAIRE.sections
    .map((s) => ({ ...s, questions: s.questions.filter((q) => q.deck) }))
    .filter((s) => s.questions.length > 0);
}
