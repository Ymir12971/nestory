import { notFound } from 'next/navigation';
import type { StoryDocumentV3 } from '@nestory/types';
import { StoryRendererV3 } from '@/app/_components/StoryRendererV3';

// 开发预览:v3 渲染器的固定样张(文案取自 2026-07-26 真实 E2E 产出)。
// 仅本地/预览环境可用;生产 404。
export default function PreviewV3Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  // external:样张要能看到水印 —— 它是渲染器画得出来的状态之一
  return <StoryRendererV3 doc={FIXTURE} external />;
}

const P = (seed: number, w = 800, h = 600) => `https://picsum.photos/seed/nestory${seed}/${w}/${h}`;

const FIXTURE: StoryDocumentV3 = {
  renderVersion: 3,
  storyId: 'preview', childId: 'preview', monthKey: '2026-05', locale: 'en-US',
  meta: { title: 'Emma · MAY 2026', childAgeMonths: 14 },
  theme: { themeId: 'default', assignedAt: '2026-07-26T00:00:00Z', version: 1 },
  watermark: { enabled: true, text: 'Made with Nestory' },
  shareMeta: { ogTitle: "Emma's MAY 2026 Story", ogDescription: '', ogImageUrl: '' },
  qualityLevel: 'low',
  cover: {
    type: 'cover', layout: 'Cover-A', month: 'MAY 2026', childName: 'Emma',
    subtitle: 'First steps, splashing tubs, and wide-open May days',
    coverPhotoUrl: P(1, 900, 1200),
  },
  opening: {
    type: 'opening',
    paragraphs: [
      'May arrived and Emma met it head-on — arms out, chin up, ready for whatever came next. From the bathtub to the backyard to the streets of Toronto, she moved through this month like someone who had decided the world was hers to investigate.',
      'You were right there beside her for all of it: the tumbles, the pancake mess, the geese that waddled a little too close.',
    ],
  },
  body: [
    {
      type: 'body', chapterTitle: 'Splashes, Steps, and Open Skies',
      narrativeThread: 'Emma pushes her physical world wider',
      blocks: [
        { momentIds: ['m1'], blockLayout: 'Block-Single-V-v2', photos: [{ url: P(2, 600, 800), ratio: '3:4' }],
          text: 'It started in the bathtub. Emma discovered that her hands, brought down hard on the surface, produced the most satisfying chaos — water everywhere, you included. The giggles that followed were less a reaction than a verdict: she approved, entirely.' },
        { momentIds: ['m2'], blockLayout: 'Block-Single-H', photos: [{ url: P(3), ratio: '4:3' }],
          text: "Then came the steps. Three of them, unassisted, before the floor rushed up to meet her. She didn't take them tentatively — she committed, the way she does everything this month." },
        { momentIds: ['m3', 'm4'], blockLayout: 'Block-Grid',
          photos: [{ url: P(4), ratio: '4:3' }, { url: P(5, 600, 800), ratio: '3:4' }, { url: P(6, 600, 600), ratio: '1:1' }],
          text: 'By the weekend she was out in the world proper — first to the Scouts, then down to the pond where the geese waddled over and helped themselves without ceremony. Emma watched everything, missing nothing.' },
      ],
    },
    {
      type: 'body', chapterTitle: 'Pancake Mornings, Bunny Afternoons',
      narrativeThread: 'quiet rituals hold their own weight',
      blocks: [
        { momentIds: ['m5'], blockLayout: 'Block-Duo',
          photos: [{ url: P(7), ratio: '4:3' }, { url: P(8), ratio: '4:3' }],
          text: 'Sunday morning, you made pancakes. Emma wore most of hers — batter on her chin, syrup somewhere near her ear — and seemed to consider this the correct outcome.' },
        { momentIds: ['m6'], blockLayout: 'Block-Text', photos: [],
          text: 'And then the quieter part of the day: nap time, bunny tucked under one arm, the whole world going still. She settled into sleep the way she does everything else — completely.' },
      ],
    },
  ],
  closing: {
    type: 'closing',
    headline: "Nestory keeps your little one's everyday moments as they grow.",
    stats: { moments: 6, photos: 13 },
  },
};
