import type { LegalDocument } from './types';

const CONTACT_EMAIL = 'support@nestory.app';

/** Not counsel-reviewed. Replace before public launch. */
export const TERMS_OF_SERVICE: LegalDocument = {
  title: 'Terms of Service',
  effectiveDate: 'May 30, 2026',
  contactEmail: CONTACT_EMAIL,
  intro:
    'These Terms govern your use of Nestory. By creating an account or using the app, you agree to them.',
  sections: [
    {
      title: '1. Your account',
      blocks: [
        {
          kind: 'paragraph',
          text: 'You must be at least 18 years old to create an account. Keep your credentials secure; you are responsible for activity on your account. You can delete your account at any time from inside the app.',
        },
      ],
    },
    {
      title: '2. Your content',
      blocks: [
        {
          kind: 'paragraph',
          text: 'You retain all rights to the photos, notes, and child profile information you put into Nestory ("Your Content"). You grant us a limited licence to store, process, and display Your Content solely to provide the app to you, including transmitting necessary inputs to our AI provider to generate stories you request.',
        },
        {
          kind: 'paragraph',
          text: "You agree not to upload content that is unlawful, infringes others' rights, or that you don't have permission to share.",
        },
      ],
    },
    {
      title: '3. Subscriptions and payment',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Nestory offers a free tier and an auto-renewing Premium subscription (monthly or yearly). Purchases are made through the Google Play Store or Apple App Store and are governed by their terms. Subscriptions renew automatically until you cancel. Cancel any time from your store account; access continues until the end of the paid period. Free trials, if offered, convert to paid unless cancelled at least 24 hours before the trial ends.',
        },
      ],
    },
    {
      title: '4. AI-generated content',
      blocks: [
        {
          kind: 'paragraph',
          text: "AI Stories are produced by a third-party model based on the moments and metadata you supply. The output may contain inaccuracies; it is intended as a keepsake, not a factual record. You are free to delete any generated story you don't want to keep.",
        },
      ],
    },
    {
      title: '5. Service availability',
      blocks: [
        {
          kind: 'paragraph',
          text: "We do our best to keep Nestory available, but we don't guarantee uninterrupted service. We may modify, suspend, or discontinue features at any time.",
        },
      ],
    },
    {
      title: '6. Disclaimers and liability',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Nestory is provided "as is", without warranties of any kind. To the maximum extent permitted by law, our liability is limited to the amount you paid us in the 12 months before the event giving rise to the claim.',
        },
      ],
    },
    {
      title: '7. Termination',
      blocks: [
        {
          kind: 'paragraph',
          text: 'You may stop using Nestory and delete your account at any time. We may suspend or terminate accounts that violate these Terms.',
        },
      ],
    },
    {
      title: '8. Changes to these Terms',
      blocks: [
        {
          kind: 'paragraph',
          text: 'We may update these Terms as the product evolves. Material changes will be surfaced in the app the next time you sign in.',
        },
      ],
    },
    {
      title: '9. Contact',
      blocks: [{ kind: 'paragraph', text: `Questions? ${CONTACT_EMAIL}` }],
    },
  ],
};
