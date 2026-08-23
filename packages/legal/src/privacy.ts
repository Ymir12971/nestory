import type { LegalDocument } from './types';

const CONTACT_EMAIL = 'support@nestory.app';

/**
 * Accurate to what the app does today, but not counsel-reviewed. Replace
 * before public Play / App Store launch.
 */
export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  effectiveDate: 'May 30, 2026',
  contactEmail: CONTACT_EMAIL,
  intro:
    'Nestory ("we", "us") is a mobile and web app that helps families capture photo moments of their children and turn them into AI-generated monthly stories. This policy explains what data we collect, why, and how to control it.',
  sections: [
    {
      title: '1. What we collect',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Account info — your email and name, supplied via Google sign-in or email/password registration.',
            "Child profile info you enter — child's name, birthday, gender, height, weight, avatar photo.",
            'Moments you create — photos and notes you upload to record moments. Photos are stored in Supabase Storage; metadata in our Supabase Postgres database.',
            'Generated content — AI Story documents created from your moments.',
            'Subscription state — when you purchase a Premium plan, the store (Google Play / App Store) reports purchase status to us via RevenueCat.',
            'Device / app context — operating system, app version, and timezone, used to deliver the service and diagnose issues.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'We do not use third-party advertising, behavioural analytics, or sell your data.',
        },
      ],
    },
    {
      title: '2. How we use it',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Display your moments and generated stories in the app.',
            'Generate monthly AI stories from the notes you write. Your photos are not sent to the AI provider — they are laid out by our own code.',
            'Manage your account, subscription, and entitlements.',
            'Respond to your support requests and act on feedback you submit.',
            'Diagnose crashes and operational issues.',
          ],
        },
      ],
    },
    {
      title: '3. Third parties we share data with',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Supabase — authentication, database, and photo storage.',
            'Anthropic — generates the AI Story from your moment text and metadata (no human review of inputs; outputs are stored in our database).',
            'Google — OAuth sign-in, and (when you purchase) Google Play billing.',
            'RevenueCat — receives purchase events from the stores so we can grant Premium entitlements.',
            'Railway / Vercel — host our backend and web renderer.',
          ],
        },
      ],
    },
    {
      title: '4. How long we keep it',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Account and content data are retained while your account is active. When you delete your account from inside the app, your account is marked deleted; full data removal completes within 30 days. Deleted data cannot be recovered after that window.',
        },
      ],
    },
    {
      title: '5. Your rights',
      blocks: [
        {
          kind: 'paragraph',
          text: `You can review and edit your profile and moments at any time in the app. You can permanently delete your account and content from Settings → Account → Delete Account. For data access requests or other questions, contact us at ${CONTACT_EMAIL}.`,
        },
      ],
    },
    {
      title: '6. Children',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Nestory is designed for parents and caregivers to record moments of their children. The app is intended for users aged 18 and over; we do not knowingly collect data from children using the app themselves.',
        },
      ],
    },
    {
      title: '7. Changes',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We may update this policy as the product evolves. Material changes will be surfaced in the app the next time you sign in.',
        },
      ],
    },
    {
      title: '8. Contact',
      blocks: [{ kind: 'paragraph', text: `Questions? ${CONTACT_EMAIL}` }],
    },
  ],
};
