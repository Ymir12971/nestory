import type { Metadata } from 'next';
import { TERMS_OF_SERVICE } from '@nestory/legal';
import { LegalPage } from '../_components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service · Nestory',
  description: 'The terms governing your use of Nestory.',
};

export default function TermsPage() {
  return <LegalPage doc={TERMS_OF_SERVICE} />;
}
