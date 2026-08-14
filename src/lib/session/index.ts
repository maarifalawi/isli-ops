import { db } from "@/db/index";
import { users } from "@/db/schema/index";
import type { Role } from "@/lib/authz/index";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export type CurrentUser = {
  id: string;
  email: string;
  nama: string;
  role: Role;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const email = data.user?.email?.trim().toLowerCase();
  if (error || !email) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      nama: users.nama,
      role: users.role,
      aktif: users.aktif,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !user.aktif) return null;
  return { id: user.id, email: user.email, nama: user.nama, role: user.role };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=Akun%20tidak%20dapat%20mengakses%20aplikasi.");
  return user;
}
