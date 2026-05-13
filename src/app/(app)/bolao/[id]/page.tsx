import { redirect } from "next/navigation";

export default async function BolaoIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/bolao/${id}/chaves`);
}
