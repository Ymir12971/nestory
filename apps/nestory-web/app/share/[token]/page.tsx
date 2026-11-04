import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiFetchError, asStoryDocument, fetchPublicShare } from '@/lib/api';
import { StoryRenderer } from '@/app/_components/StoryRenderer';
import { StoryRendererV3 } from '@/app/_components/StoryRendererV3';
import { isStoryDocumentV3 } from '@nestory/types';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

// A shared Story carries the child's name and photos; the privacy policy (§13)
// promises it stays out of search results. Link previews still work — OG tags
// are read by chat apps, not blocked by noindex.
const NO_INDEX: Metadata['robots'] = { index: false, follow: false };

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  try {
    const share = await fetchPublicShare(token);
    return {
      robots: NO_INDEX,
      title: share.og.title,
      description: share.og.description,
      openGraph: {
        title: share.og.title,
        description: share.og.description,
        images: share.og.imageUrl ? [share.og.imageUrl] : undefined,
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: share.og.title,
        description: share.og.description,
        images: share.og.imageUrl ? [share.og.imageUrl] : undefined,
      },
    };
  } catch {
    // generateMetadata can't show a 404; the page handler below does.
    return { robots: NO_INDEX, title: 'Nestory' };
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  let share;
  try {
    share = await fetchPublicShare(token);
  } catch (err) {
    // 400 as well as 404: the API's token param is `min(43)`, so a link that a
    // chat client wrapped or a user truncated fails validation rather than
    // lookup. Both mean "this link isn't a share" to the visitor — only a real
    // outage should reach the error boundary.
    if (err instanceof ApiFetchError && (err.status === 400 || err.status === 404)) notFound();
    throw err;
  }

  const doc = asStoryDocument(share.document);
  return isStoryDocumentV3(doc)
    ? <StoryRendererV3 doc={doc} external />
    : <StoryRenderer doc={doc} external />;
}
