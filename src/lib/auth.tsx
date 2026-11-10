import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  division: string;
  password: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<{ emailConfirmationRequired: boolean }>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

async function lookupAdminRole(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw error;
  return data?.role === "admin";
}

export async function getVerifiedSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") throw error;
  if (!data.user) return null;
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  return sessionData.session?.user.id === data.user.id ? sessionData.session : null;
}

export async function hasAdminRole(userId: string): Promise<boolean> {
  return lookupAdminRole(userId);
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let roleRequest = 0;

    const applySession = async (session: Session | null) => {
      const requestId = ++roleRequest;
      if (!active) return;
      setUser(session?.user ?? null);
      setIsAdmin(false);
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const admin = await lookupAdminRole(session.user.id);
        if (active && requestId === roleRequest) setIsAdmin(admin);
      } catch (error) {
        if (active && requestId === roleRequest) {
          toast.error(
            error instanceof Error ? error.message : "Role akun gagal diverifikasi dari Supabase.",
          );
        }
      } finally {
        if (active && requestId === roleRequest) setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return applySession(data.session);
      })
      .catch((error: unknown) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Sesi Supabase gagal dimuat.");
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    if (!data.session) throw new Error("Supabase tidak membuat sesi login.");
    setUser(data.user);
    setIsAdmin(await lookupAdminRole(data.user.id));
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: {
          full_name: input.name.trim(),
          phone_number: input.phone.trim(),
          division: input.division,
        },
      },
    });
    if (error) throw error;
    if (data.session && data.user) {
      setUser(data.user);
      setIsAdmin(await lookupAdminRole(data.user.id));
    }
    return { emailConfirmationRequired: !data.session };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setIsAdmin(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, isAdmin, login, register, resetPassword, updatePassword, logout }),
    [user, loading, isAdmin, login, register, resetPassword, updatePassword, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
