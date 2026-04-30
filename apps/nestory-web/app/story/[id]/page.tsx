interface StoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { id } = await params;
  return (
    <main>
      <h1>Story {id}</h1>
      <p>StoryRenderer 占位。</p>
    </main>
  );
}
