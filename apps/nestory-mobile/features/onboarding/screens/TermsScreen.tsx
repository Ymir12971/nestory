import { TERMS_OF_SERVICE } from '@nestory/legal';
import { LegalScreen } from './LegalScreen';

export function TermsScreen() {
  return <LegalScreen policy={TERMS_OF_SERVICE} />;
}
