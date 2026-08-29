import { notFound } from 'next/navigation';
import { ApiFetchError, fetchStory } from '@/lib/api';
import { StoryRenderer } from '@/app/_components/StoryRenderer';
import { StoryRendererV3 } from '@/app/_components/StoryRendererV3';
import { isStoryDocumentV3 } from '@nestory/types';

interface StoryPageProps {
  params:       Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}

/**
 * In-app WebView surface. Mobile loads `/story/<id>?t=<accessToken>` and the
 * page authenticates against the API using the supplied token. Unlike
 * `/share/[token]`, this URL is private — it 401s without `t`.
 *
 * No metadata for this route — it's rendered inside the mobile app where
 * social previews don't apply, and we never want it to be search-indexable.
 */
export const metadata = {
  title:   'Nestory',
  robots:  { index: false, follow: false },
};

export default async function StoryPage({ params, searchParams }: StoryPageProps) {
  const { id } = await params;
  const { t }  = await searchParams;

  if (!t) {
    return (
      <main style={{ padding: 40, fontFamily: 'system-ui', textAlign: 'center', color: '#555' }}>
        <p>This page requires an access token.</p>
        <p style={{ fontSize: 13, marginTop: 8 }}>Open it from inside the app.</p>
      </main>
    );
  }

  let detail;
  try {
    detail = await fetchStory(id, t);
  } catch (err) {
    // 400 = the id isn't a uuid; same "no such story" outcome as 404 (see /share).
    if (err instanceof ApiFetchError && [400, 401, 404].includes(err.status)) notFound();
    throw err;
  }

  const doc = detail.document;
  return isStoryDocumentV3(doc) ? <StoryRendererV3 doc={doc} /> : <StoryRenderer doc={doc} />;
}
