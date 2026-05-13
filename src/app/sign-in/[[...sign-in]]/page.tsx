import { SignIn } from "@clerk/nextjs";
import { AuthSide } from "@/components/auth-side";

export default function SignInPage() {
  return (
    <div className="auth-shell">
      <AuthSide eyebrow="entrar" />
      <div className="auth-form">
        <div className="auth-form-inner">
          <div className="page-eyebrow">Boas-vindas de volta</div>
          <h1 className="page-title" style={{ fontSize: 28, marginBottom: 6 }}>
            Entrar no Bolão
          </h1>
          <p className="page-sub" style={{ marginBottom: 24 }}>
            Use seu e-mail para acessar bolões e fazer palpites.
          </p>
          <SignIn
            signUpUrl="/sign-up"
            forceRedirectUrl="/dashboard"
            appearance={{ elements: { rootBox: "w-full", card: "shadow-none" } }}
          />
        </div>
      </div>
    </div>
  );
}
