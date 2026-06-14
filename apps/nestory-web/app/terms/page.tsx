import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service · Nestory',
  description: 'The rules and conditions for using Nestory.',
};

const EFFECTIVE_DATE = 'May 30, 2026';
const CONTACT_EMAIL  = 'support@nestory.app';

// Placeholder terms — replace with counsel-reviewed text before public launch.
export default function TermsPage() {
  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>Terms of Service</h1>
      <p style={metaStyle}>Effective {EFFECTIVE_DATE}</p>

      <p>
        These Terms govern your use of Nestory. By creating an account or using
        the app, you agree to them.
      </p>

      <h2 style={h2Style}>1. Your account</h2>
      <p>
        You must be at least 18 years old to create an account. Keep your
        credentials secure; you are responsible for activity on your account.
        You can delete your account at any time from inside the app.
      </p>

      <h2 style={h2Style}>2. Your content</h2>
      <p>
        You retain all rights to the photos, notes, and child profile
        information you put into Nestory ("Your Content"). You grant us a
        limited licence to store, process, and display Your Content solely to
        provide the app to you, including transmitting necessary inputs to our
        AI provider to generate stories you request.
      </p>
      <p>
        You agree not to upload content that is unlawful, infringes others'
        rights, or that you don't have permission to share.
      </p>

      <h2 style={h2Style}>3. Subscriptions and payment</h2>
      <p>
        Nestory offers a free tier and an auto-renewing Premium subscription
        (monthly or yearly). Purchases are made through the Google Play Store
        or Apple App Store and are governed by their terms. Subscriptions
        renew automatically until you cancel. Cancel any time from your store
        account; access continues until the end of the paid period. Free
        trials, if offered, convert to paid unless cancelled at least 24 hours
        before the trial ends.
      </p>

      <h2 style={h2Style}>4. AI-generated content</h2>
      <p>
        AI Stories are produced by a third-party model based on the memories
        and metadata you supply. The output may contain inaccuracies; it is
        intended as a keepsake, not a factual record. You are free to delete
        any generated story you don't want to keep.
      </p>

      <h2 style={h2Style}>5. Service availability</h2>
      <p>
        We do our best to keep Nestory available, but we don't guarantee
        uninterrupted service. We may modify, suspend, or discontinue features
        at any time.
      </p>

      <h2 style={h2Style}>6. Disclaimers and liability</h2>
      <p>
        Nestory is provided <strong>"as is"</strong>, without warranties of any
        kind. To the maximum extent permitted by law, our liability is limited
        to the amount you paid us in the 12 months before the event giving
        rise to the claim.
      </p>

      <h2 style={h2Style}>7. Termination</h2>
      <p>
        You may stop using Nestory and delete your account at any time. We may
        suspend or terminate accounts that violate these Terms.
      </p>

      <h2 style={h2Style}>8. Changes to these Terms</h2>
      <p>
        We may update these Terms as the product evolves. Material changes
        will be surfaced in the app the next time you sign in.
      </p>

      <h2 style={h2Style}>9. Contact</h2>
      <p>
        Questions? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: '48px 24px 96px',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  color: '#111',
  lineHeight: 1.6,
  fontSize: 16,
};
const h1Style: React.CSSProperties = { fontSize: 32, fontWeight: 700, marginBottom: 4 };
const h2Style: React.CSSProperties = { fontSize: 20, fontWeight: 600, marginTop: 36, marginBottom: 8 };
const metaStyle: React.CSSProperties = { color: '#666', marginBottom: 24 };
