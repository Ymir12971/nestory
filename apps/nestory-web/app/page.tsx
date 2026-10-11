import { redirect } from 'next/navigation';

// This app only serves /story/[id] (in-app WebView) and /share/[token]. Anyone
// who lands on the bare domain — a trimmed share link, say — goes to the site.
export default function HomePage() {
  redirect('https://nestory.love');
}
