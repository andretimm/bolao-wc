import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthSide } from "@/components/auth-side";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="auth-shell">
      <AuthSide eyebrow="bem-vindo" />
      <div className="auth-form">
        <div className="auth-form-inner">
          <div className="page-eyebrow">Bolão da Copa 2026</div>
          <h1 className="page-title" style={{ fontSize: 32 }}>
            Quem palpita melhor,<br />leva.
          </h1>
          <p className="page-sub" style={{ marginBottom: 28 }}>
            Crie seu bolão, convide a galera e dispute o ranking até a final.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Link href="/sign-up" className="btn primary lg block">Criar conta</Link>
            <Link href="/sign-in" className="btn lg block">Já tenho conta</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
