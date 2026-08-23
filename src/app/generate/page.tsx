export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ text?: string }>;
}) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const { text } = await searchParams;

  return (
    <div>
      <p>입력한 경로: {text}</p>
    </div>
  );
}
