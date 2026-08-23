import GenerateClient from "./GenerateClient";

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ text?: string }>;
}) {
  const { text } = await searchParams;

  return <GenerateClient text={text ?? ""} />;
}
