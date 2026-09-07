// Seed a realistic sample customer: survey responses + a fully-populated workshop
// pack (incl. the new Phase-01 North Star and Phase-05 Data ask).
// Run: npx tsx scripts/seed-sample.ts   → prints the /workshop and /s links.
import { createSurvey, createResponse, updateResponse, saveWorkshop, deleteSurvey } from '../lib/db';
import { scoresToMatrix, type WorkshopPack, type UseCaseScores } from '../lib/workshop';

const SLUG = 'sample-northwind';
const NAME = 'Northwind Logistics (Sample)';

const V = (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number): UseCaseScores => ({
  strategicAlignment: a, frequencyVolume: b, potentialRoi: c, userExperience: d,
  dataAvailability: e, toleranceForError: f, complexityOfLogic: g, integrationEase: h,
});

async function main() {
  await deleteSurvey(SLUG).catch(() => {}); // idempotent re-seed
  await createSurvey(SLUG, NAME);

  // ---- Survey response 1 — Ops SME ----
  const r1 = await createResponse('sample-tok-ops', SLUG);
  await updateResponse(r1.token, {
    respondent_name: 'Dana Ortiz', role: 'business_sme', status: 'submitted',
    answers: {
      profile: { name: 'Dana Ortiz', email: 'dana@northwind.example', role: 'business_sme', department: 'Finance Operations' },
      friction: {
        core_process: 'Matching supplier invoices to POs and chasing exceptions by email — ~30% of the AP team\'s week.',
        bottleneck: ['swivel_chair', 'handoffs', 'dirty_data'],
        if_only_knew: 'Which invoices will become disputes before we pay them.',
      },
      platform: { current_platform: ['snowflake', 'aws'], tools_stack: ['erp_crm', 'chat', 'bi'] },
      data_readiness: { data_format: ['structured', 'unstructured', 'comms'], data_quality: 3 },
      strategic_impact: { value_driver: ['toil', 'cycle_time', 'quality'], risk_tolerance: 'high_risk' },
      blue_sky: { magic_assistant: 'Show me every invoice likely to be disputed this month and why.' },
      use_cases: [
        {
          uc_name: 'Invoice exception triage', uc_pattern: ['classification', 'extraction', 'agent_workflow'],
          uc_process_steps: '1) Invoice lands in shared inbox 2) Clerk keys it into ERP 3) Mismatch flagged 4) Clerk emails supplier 5) Waits for reply 6) Manual re-match',
          uc_systems: ['erp_crm', 'chat', 'data'], uc_hitl: 'review_output', uc_frequency: 'daily',
          uc_cost_of_inaction: 'Late-payment penalties + 2 FTE of manual chasing; missed early-payment discounts.',
          uc_history: '3 years of invoices + resolution notes in ERP; supplier emails in a shared mailbox.',
          uc_compliance: 'SOX controls on approvals; audit trail required. If AI is down, fall back to manual queue.',
          uc_kill_the_idea: 'Supplier emails are unstructured and inconsistent — extraction may be too noisy to trust.',
        },
      ],
    },
  });

  // ---- Survey response 2 — Data architect ----
  const r2 = await createResponse('sample-tok-arch', SLUG);
  await updateResponse(r2.token, {
    respondent_name: 'Sam Lee', role: 'it_data_architect', status: 'submitted',
    answers: {
      profile: { name: 'Sam Lee', email: 'sam@northwind.example', role: 'it_data_architect', department: 'Platform Engineering' },
      friction: {
        core_process: 'Model-pull requests: raise a Jira ticket, wait for lead approval, MLE manually registers the model.',
        bottleneck: ['approval', 'ticketing', 'queue'],
        if_only_knew: 'Which internal teams will need which models next quarter.',
      },
      platform: { current_platform: ['cloudera', 'aws'], tools_stack: ['ticketing', 'scm', 'cicd', 'ml_platform'] },
      data_readiness: { data_format: ['structured', 'tribal'], data_quality: 4 },
      strategic_impact: { value_driver: ['velocity', 'self_service', 'governance'], risk_tolerance: 'low_risk' },
      blue_sky: { magic_assistant: 'What is the safest model registration path for this request, pre-checked against policy?' },
      use_cases: [
        {
          uc_name: 'Model-pull request automation', uc_pattern: ['agent_workflow', 'assistant'],
          uc_process_steps: '1) Requester raises Jira 2) Lead approves 3) Requester enters model details 4) MLE pulls & registers 5) Requester notified',
          uc_systems: ['ticketing', 'scm', 'ml_platform', 'internal_api'], uc_hitl: 'approve_before', uc_frequency: 'weekly',
          uc_cost_of_inaction: '3–5 day lead time per request; MLEs spend ~1 day/week on toil.',
          uc_history: '2 years of Jira tickets with outcomes; runbooks in Confluence.',
          uc_compliance: 'Model governance / approval gate is mandatory. Human must approve before registration.',
          uc_kill_the_idea: 'Approval is a hard compliance gate — full automation may not be permitted.',
        },
      ],
    },
  });

  // ---- Workshop pack (as if generated + facilitated) ----
  const s1 = V(5, 5, 5, 3, 3, 3, 5, 5); // invoice triage
  const s2 = V(3, 3, 3, 3, 5, 1, 3, 5); // model-pull automation
  const pack: WorkshopPack = {
    strategy: {
      northStar: 'Cut invoice-to-pay cycle time in half while keeping 100% audit coverage.',
      sponsor: 'CFO — via VP Finance Operations',
      valueDrivers: 'Toil reduction, cycle time, early-payment discounts, dispute avoidance',
      guardrails: 'SOX audit trail required; human approval on any payment action; no PII to external models',
    },
    signals: {
      patterns: ['classification', 'extraction', 'agent_workflow'],
      systems: ['erp_crm', 'ticketing', 'ml_platform', 'chat'],
      hitl: ['approve_before', 'review_output'],
    },
    useCases: [
      {
        id: 'uc-invoice', name: 'Invoice exception triage', source: 'survey',
        summary: 'Auto-extract + match invoices, draft supplier follow-ups, human approves.',
        context: 'AP team spends ~30% of the week matching invoices and chasing exceptions.',
        scores: s1, matrix: scoresToMatrix(s1),
        rationale: 'High-frequency, clear ROI; data is largely structured with some noisy email.',
        pattern: ['classification', 'extraction', 'agent_workflow'], systems: ['erp_crm', 'chat', 'data'], hitl: 'review_output',
        canvas: {
          prediction: 'Likelihood an invoice will mismatch / become a dispute.',
          judgment: 'Whether to auto-clear, route to a clerk, or escalate.',
          action: 'Draft the supplier email and pre-fill the ERP correction for human approval.',
          outcome: 'Faster clean-match rate; fewer late-payment penalties.',
          training: '3 years of invoices + resolution notes; labeled dispute outcomes.',
          input: 'Incoming invoice (PDF/EDI), matching PO, supplier email thread.',
          feedback: 'Clerk accept/edit/reject on each drafted action feeds back into scoring.',
        },
        killIdea: 'Supplier emails are unstructured; extraction noise could erode trust — mitigate with human review on low-confidence items.',
      },
      {
        id: 'uc-modelpull', name: 'Model-pull request automation', source: 'survey',
        summary: 'Assistant pre-checks requests against policy; agent registers after human approval.',
        context: 'Model-pull requests take 3–5 days through Jira + manual MLE steps.',
        scores: s2, matrix: scoresToMatrix(s2),
        rationale: 'Structured data and clear rules, but a hard approval gate caps full automation.',
        pattern: ['agent_workflow', 'assistant'], systems: ['ticketing', 'scm', 'ml_platform', 'internal_api'], hitl: 'approve_before',
        canvas: {
          prediction: 'Whether a request meets policy and which registration path fits.',
          judgment: 'Approve / request changes — stays with the human lead.',
          action: 'On approval, register the model and notify the requester.',
          outcome: 'Lead time from days to hours; MLE toil removed.',
          training: '2 years of Jira tickets with outcomes; Confluence runbooks.',
          input: 'Jira request fields, model metadata, policy checklist.',
          feedback: 'Approvals/rejections refine the policy pre-check.',
        },
        killIdea: 'Approval is a mandatory compliance gate — position as assisted approval, not full automation.',
      },
    ],
    architecture: {
      forUseCaseId: 'uc-invoice',
      notes: 'RAG + extraction over invoices/emails on Cloudera AI, with a human-approval step before any ERP write.',
      components: [
        { id: 'c1', label: 'Cloudera AI Workbench', role: 'Host extraction + matching models and the agent.' },
        { id: 'c2', label: 'Iceberg / Open Data Lakehouse', role: 'Invoice + PO history and labeled dispute outcomes.' },
        { id: 'c3', label: 'ERP connector', role: 'Read POs; write corrections only after human approval.' },
        { id: 'c4', label: 'Slack/Email tool', role: 'Deliver drafted supplier follow-ups for review.' },
      ],
    },
    roadmap: {
      backlog: [
        { useCaseId: 'uc-invoice', mvp: 'Extraction + match on the top 3 suppliers, human approves every action.', nextSteps: 'Measure clean-match rate vs. baseline over 2 weeks.' },
        { useCaseId: 'uc-modelpull', mvp: 'Policy pre-check assistant on new Jira requests (no auto-register yet).', nextSteps: 'Pilot with the platform team; add registration after approval flow is trusted.' },
      ],
      raci: [
        { task: 'Provide invoice + dispute data extract', responsible: 'Dana Ortiz (AP)', accountable: 'VP Finance Ops', consulted: 'Data Architecture', informed: 'CFO' },
        { task: 'Stand up Cloudera AI workbench + connectors', responsible: 'Sam Lee (Platform)', accountable: 'Head of Platform', consulted: 'Security', informed: 'AP team' },
      ],
      dataAsk: {
        ask: '6 months of invoices with PO matches + resolution notes (anonymized), and the shared-mailbox export.',
        owner: 'Dana Ortiz (AP lead)',
        due: '2 weeks',
      },
    },
    generatedAt: new Date().toISOString(),
  };
  await saveWorkshop(SLUG, pack, 'generated');

  console.log('Seeded sample customer.');
  console.log(`  Survey (public):   /s/${SLUG}`);
  console.log(`  Deck (sales):      /d/${SLUG}`);
  console.log(`  Workshop (admin):  /workshop/${SLUG}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
