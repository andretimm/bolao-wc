import { SignUp } from "@clerk/nextjs";
import { AuthSide } from "@/components/auth-side";

export default function SignUpPage() {
  return (
    <div className="auth-shell">
      <AuthSide eyebrow="criar conta" />
      <div className="auth-form">
        <div className="auth-form-inner">
          <div className="page-eyebrow">Sem conta? Vamos criar.</div>
          <h1 className="page-title" style={{ fontSize: 28, marginBottom: 6 }}>
            Criar conta
          </h1>
          <p className="page-sub" style={{ marginBottom: 24 }}>
            Você poderá criar bolões ou entrar com um código de convite.
          </p>
          <SignUp
            signInUrl="/sign-in"
            forceRedirectUrl="/dashboard"
            appearance={{ elements: { rootBox: "w-full", card: "shadow-none" } }}
          />
        </div>
      </div>
    </div>
  );
}
