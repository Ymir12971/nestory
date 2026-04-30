interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  return (
    <main>
      <h1>Shared Story</h1>
      <p>Token: {token}</p>
      <p>PublicShareShell + StoryRenderer 占位。</p>
    </main>
  );
}
