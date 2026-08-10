import { getSurvey } from '@/lib/db';
import DeckForm from '@/components/DeckForm';

export const dynamic = 'force-dynamic';

// Sales-driven presentation view of the same survey (see /s/[slug] for the
// self-serve form). Same slug, same response store.
export default async function DeckPage({ params }: { params: { slug: string } }) {
  const survey = await getSurvey(params.slug);

  if (!survey) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="max-w-md text-center">
          <div className="text-cloudera-orange font-bold tracking-widest text-sm">CLOUDERA</div>
          <h1 className="mt-4 text-2xl font-semibold">Deck not found</h1>
          <p className="mt-2 text-cloudera-slate">
            This link doesn’t match an active discovery. Please double-check the URL with your
            Cloudera contact.
          </p>
        </div>
      </main>
    );
  }

  if (survey.status === 'closed') {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="max-w-md text-center">
          <div className="text-cloudera-orange font-bold tracking-widest text-sm">CLOUDERA</div>
          <h1 className="mt-4 text-2xl font-semibold">This discovery is closed</h1>
          <p className="mt-2 text-cloudera-slate">Thanks for your interest — please reach out to your Cloudera contact.</p>
        </div>
      </main>
    );
  }

  return <DeckForm slug={survey.slug} displayName={survey.display_name} />;
}
