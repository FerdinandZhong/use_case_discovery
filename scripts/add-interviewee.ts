// Append ONE new survey response (a new interviewee) to an existing sample
// customer — non-destructive (does not wipe the survey or other responses).
// Run: npx tsx scripts/add-interviewee.ts
import { createResponse, updateResponse, getResponse } from '../lib/db';

const SLUG = 'sample-northwind';
const TOKEN = 'sample-tok-clerk'; // fixed → re-runnable (updates instead of duplicating)

async function main() {
  if (!(await getResponse(TOKEN))) await createResponse(TOKEN, SLUG);
  await updateResponse(TOKEN, {
    respondent_name: 'Priya Nair', role: 'end_user', status: 'submitted',
    answers: {
      profile: { name: 'Priya Nair', email: 'priya@northwind.example', role: 'end_user', department: 'Accounts Payable Operations' },
      friction: {
        // A NEW angle: the frontline clerk sees duplicates the SME/architect didn't flag.
        core_process: 'Spotting duplicate & already-paid invoices before they go out — I eyeball vendor, amount and date across two screens all day.',
        bottleneck: ['dirty_data', 'swivel_chair', 'specialized'],
        if_only_knew: 'Whether an invoice is a duplicate or was already paid, the moment it arrives.',
      },
      platform: { current_platform: ['snowflake', 'aws'], tools_stack: ['erp_crm', 'chat', 'bi'] },
      data_readiness: { data_format: ['structured', 'unstructured'], data_quality: 2 }, // she sees the mess → low trust
      strategic_impact: { value_driver: ['quality', 'toil', 'cost'], risk_tolerance: 'high_risk' },
      blue_sky: { magic_assistant: 'Flag every duplicate or already-paid invoice instantly, with the matching prior payment.' },
      use_cases: [
        {
          uc_name: 'Duplicate & already-paid invoice detection',
          uc_pattern: ['classification', 'anomaly'],
          uc_process_steps: '1) Invoice arrives 2) I search ERP by vendor+amount 3) Cross-check the payment ledger 4) Eyeball date/PO for near-dupes 5) Hold or release',
          uc_systems: ['erp_crm', 'data'], uc_hitl: 'review_output', uc_frequency: 'daily',
          uc_cost_of_inaction: 'Double payments caught late (or not) → clawback effort + strained vendor trust.',
          uc_history: '3 years of invoices with payment status; vendor master in ERP.',
          uc_compliance: 'SOX; any auto-hold must be auditable and reversible.',
          uc_kill_the_idea: 'Legitimate re-bills look like duplicates — false positives could block valid payments.',
        },
      ],
    },
  });
  console.log(`Added interviewee 'Priya Nair' (end_user) to /workshop/${SLUG}. Regenerate the pack to score her use case.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
