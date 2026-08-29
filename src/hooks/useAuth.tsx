import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "engineer";

export type Profile = {
  id: string;
  full_name: string;
  employee_code: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
};

type AuthValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: Role | null;
  loading: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const loadContext = async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      setRole(null);
      return;
    }
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, employee_code, phone, email, is_active")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile((prof as Profile) ?? null);
    const roleList = (roles ?? []).map((r) => r.role as Role);
    setRole(roleList.includes("admin") ? "admin" : (roleList[0] ?? "engineer"));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setTimeout(() => {
        void loadContext(next?.user?.id);
      }, 0);
    });
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await loadContext(data.session?.user?.id);
      setLoading(false);
    })();
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role,
      loading,
      isAdmin: role === "admin",
      refresh: () => loadContext(session?.user?.id),
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setRole(null);
      },
    }),
    [session, profile, role, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
