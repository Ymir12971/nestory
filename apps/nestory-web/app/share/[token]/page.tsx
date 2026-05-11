import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiFetchError, asStoryDocument, fetchPublicShare } from '@/lib/api';
import { StoryRenderer } from '@/app/_components/StoryRenderer';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  try {
    const share = await fetchPublicShare(token);
    return {
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
    return { title: 'Nestory' };
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  let share;
  try {
    share = await fetchPublicShare(token);
  } catch (err) {
    if (err instanceof ApiFetchError && err.status === 404) notFound();
    throw err;
  }

  return <StoryRenderer doc={asStoryDocument(share.document)} />;
}
