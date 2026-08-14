import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type LoginPageProps = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) redirect("/login?error=1");
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-md">
      <h1 className="text-title">Masuk</h1>
      <p className="mt-1 text-body text-ink-48">
        Gunakan email dan kata sandi akun ISLI.
      </p>
      {params.error && (
        <p className="mt-4 text-body text-ink-80">Email atau kata sandi salah.</p>
      )}
      <form action={login} className="mt-6 space-y-4">
        <label className="block text-label text-ink-80">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 min-h-touch w-full border border-divider bg-pearl px-3 text-body"
          />
        </label>
        <label className="block text-label text-ink-80">
          Kata sandi
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 min-h-touch w-full border border-divider bg-pearl px-3 text-body"
          />
        </label>
        <button type="submit" className="min-h-touch bg-accent px-4 text-body text-pearl">
          Masuk
        </button>
      </form>
    </main>
  );
}
