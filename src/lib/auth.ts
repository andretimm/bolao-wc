import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/** Gate server components/actions. Retorna apenas Clerk userId. */
export async function requireAuth(): Promise<{ userId: string }> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return { userId };
}

/** Sessão + objeto Clerk completo. Use só quando precisar de nome/email/avatar do user logado. */
export async function requireCurrentUser() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return user;
}
