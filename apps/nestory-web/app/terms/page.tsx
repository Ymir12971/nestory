import type { Metadata } from 'next';
import { TERMS_OF_SERVICE } from '@nestory/legal';
import { TermlyEmbed } from '../_components/TermlyEmbed';

export const metadata: Metadata = {
  title: 'Terms of Service · Nestory',
  description: 'The terms governing your use of Nestory.',
};

export default function TermsPage() {
  return <TermlyEmbed policy={TERMS_OF_SERVICE} />;
}
