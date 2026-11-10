import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, LoaderCircle, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AuthField } from "@/components/auth/AuthField";
import { AuthHero } from "@/components/auth/AuthHero";
import { Button } from "@/components/ui/button";
import { useAuth, type RegisterInput } from "@/lib/auth";
import { WORK_DIVISIONS } from "@/lib/studio";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
    reason: typeof search["reason"] === "string" ? search["reason"] : undefined,
    mode: search["mode"] === "reset" ? ("reset" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Masuk — MNC Booking Studio" },
      { name: "description", content: "Masuk atau daftar akun untuk reservasi studio MNC Group." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "register" | "reset";
interface RegisterForm extends RegisterInput {
  confirmPassword: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthPage() {
  const { user, loading, login, register, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { redirect: requestedRedirect, reason, mode: requestedMode } = Route.useSearch();
  const catalogRedirectNotified = useRef(false);
  const safeDestination =
    requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/";
  const [mode, setMode] = useState<Mode>(requestedMode ?? "login");
  const [busy, setBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loginTouched, setLoginTouched] = useState({ email: false, password: false });
  const [registration, setRegistration] = useState<RegisterForm>({
    name: "",
    email: "",
    phone: "",
    division: "Production",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState<Record<keyof RegisterForm, boolean>>({
    name: false,
    email: false,
    phone: false,
    division: false,
    password: false,
    confirmPassword: false,
  });

  useEffect(() => {
    if (reason === "catalog" && !catalogRedirectNotified.current) {
      catalogRedirectNotified.current = true;
      toast.warning("Silakan masuk terlebih dahulu untuk melihat katalog studio");
    }
  }, [reason]);

  useEffect(() => {
    if (mode === "login" && !loading && user) void navigate({ to: safeDestination });
  }, [mode, user, loading, navigate, safeDestination]);

  const loginErrors = useMemo(
    () => ({
      email: !loginEmail
        ? "Email wajib diisi."
        : !emailPattern.test(loginEmail)
          ? "Format email tidak valid."
          : "",
      password: !loginPassword
        ? "Kata sandi wajib diisi."
        : loginPassword.length < 6
          ? "Kata sandi minimal 6 karakter."
          : "",
    }),
    [loginEmail, loginPassword],
  );

  const registerErrors = useMemo(
    () => ({
      name: registration.name.trim().length < 2 ? "Nama lengkap minimal 2 karakter." : "",
      email: !emailPattern.test(registration.email) ? "Format email tidak valid." : "",
      phone: !/^\+?[0-9][0-9\s-]{7,14}$/.test(registration.phone)
        ? "Nomor WhatsApp tidak valid."
        : "",
      division: !registration.division ? "Pilih divisi atau unit kerja." : "",
      password: registration.password.length < 6 ? "Kata sandi minimal 6 karakter." : "",
      confirmPassword:
        registration.confirmPassword !== registration.password
          ? "Konfirmasi kata sandi tidak cocok."
          : "",
    }),
    [registration],
  );

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginTouched({ email: true, password: true });
    if (loginErrors.email || loginErrors.password) return;
    setBusy(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success("Berhasil masuk", {
        description: "Selamat datang kembali di MNC Studio Booking.",
      });
      await navigate({ to: safeDestination });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan saat masuk.");
    } finally {
      setBusy(false);
    }
  };

  const submitRegister = async (event: FormEvent) => {
    event.preventDefault();
    setTouched({
      name: true,
      email: true,
      phone: true,
      division: true,
      password: true,
      confirmPassword: true,
    });
    if (Object.values(registerErrors).some(Boolean)) return;
    setBusy(true);
    try {
      const { confirmPassword, ...account } = registration;
      const { emailConfirmationRequired } = await register(account);
      if (emailConfirmationRequired) {
        toast.success("Pendaftaran berhasil", {
          description: "Periksa email Anda untuk mengonfirmasi akun sebelum masuk.",
        });
        setMode("login");
        setLoginEmail(account.email);
        setLoginPassword("");
      } else {
        toast.success("Akun berhasil dibuat", {
          description: "Anda sudah masuk dan siap membuat booking.",
        });
        await navigate({ to: "/" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pendaftaran gagal.");
    } finally {
      setBusy(false);
    }
  };

  const submitPasswordUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Kata sandi minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(newPassword);
      toast.success("Kata sandi berhasil diperbarui.");
      await navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kata sandi gagal diperbarui.");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setBusy(false);
  };
  if (loading) return null;
  if (user && mode !== "reset") return null;

  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(430px,0.92fr)_minmax(520px,1.08fr)]">
      <AuthHero register={mode === "register"} />
      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-600 text-white">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="font-bold text-slate-950">MNC Studio</p>
              <p className="text-xs text-slate-500">Booking Management</p>
            </div>
          </div>
          <p className="mb-2 text-sm font-semibold text-red-600">
            {mode === "login"
              ? "Selamat datang kembali"
              : mode === "register"
                ? "Registrasi akun baru"
                : "Pembaruan kata sandi"}
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">
            {mode === "login"
              ? "Masuk ke akun Anda"
              : mode === "register"
                ? "Buat akun MNC Studio"
                : "Atur kata sandi baru"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {mode === "login"
              ? "Kelola reservasi studio produksi Anda dari satu tempat."
              : mode === "register"
                ? "Lengkapi data berikut untuk mulai melakukan reservasi."
                : "Pilih kata sandi baru untuk akun MNC Studio Anda."}
          </p>

          {mode === "login" ? (
            <form onSubmit={submitLogin} className="mt-7 space-y-5" noValidate>
              <AuthField
                id="login-email"
                label="Email"
                type="email"
                icon={<Mail className="size-4" />}
                placeholder="nama@perusahaan.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onBlur={() => setLoginTouched((v) => ({ ...v, email: true }))}
                error={loginTouched.email ? loginErrors.email : undefined}
                autoComplete="username"
              />
              <AuthField
                id="login-password"
                label="Kata Sandi"
                type="password"
                icon={<LockKeyhole className="size-4" />}
                placeholder="Masukkan kata sandi"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onBlur={() => setLoginTouched((v) => ({ ...v, password: true }))}
                error={loginTouched.password ? loginErrors.password : undefined}
                autoComplete="current-password"
              />
              <div className="flex items-center justify-between gap-4">
                <span className="min-h-11 self-center text-sm text-slate-500">
                  Sesi dikelola dengan aman oleh Supabase.
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!emailPattern.test(loginEmail)) {
                      toast.info(
                        "Masukkan email yang valid untuk menerima tautan reset kata sandi.",
                      );
                      return;
                    }
                    try {
                      await resetPassword(loginEmail);
                      toast.success("Tautan reset kata sandi telah dikirim ke email Anda.");
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Permintaan reset gagal.",
                      );
                    }
                  }}
                  className="min-h-11 text-sm font-semibold text-red-600 hover:text-red-700"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <SubmitButton busy={busy}>Masuk</SubmitButton>
            </form>
          ) : mode === "register" ? (
            <form onSubmit={submitRegister} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
              <div className="sm:col-span-2">
                <AuthField
                  id="register-name"
                  label="Nama Lengkap"
                  icon={<UserRound className="size-4" />}
                  value={registration.name}
                  onChange={(e) => setRegistration((v) => ({ ...v, name: e.target.value }))}
                  onBlur={() => setTouched((v) => ({ ...v, name: true }))}
                  error={touched.name ? registerErrors.name : undefined}
                  placeholder="Nama lengkap"
                  autoComplete="name"
                />
              </div>
              <div className="sm:col-span-2">
                <AuthField
                  id="register-email"
                  label="Email Perusahaan"
                  type="email"
                  icon={<Mail className="size-4" />}
                  value={registration.email}
                  onChange={(e) => setRegistration((v) => ({ ...v, email: e.target.value }))}
                  onBlur={() => setTouched((v) => ({ ...v, email: true }))}
                  error={touched.email ? registerErrors.email : undefined}
                  placeholder="nama@mncgroup.com"
                  autoComplete="email"
                />
              </div>
              <AuthField
                id="register-phone"
                label="Nomor WhatsApp / Telepon"
                icon={<Phone className="size-4" />}
                value={registration.phone}
                onChange={(e) => setRegistration((v) => ({ ...v, phone: e.target.value }))}
                onBlur={() => setTouched((v) => ({ ...v, phone: true }))}
                error={touched.phone ? registerErrors.phone : undefined}
                placeholder="0812xxxxxxx"
                autoComplete="tel"
              />
              <div className="space-y-1.5">
                <label htmlFor="register-division" className="text-sm font-semibold text-slate-700">
                  Divisi / Unit Kerja
                </label>
                <select
                  id="register-division"
                  value={registration.division}
                  onChange={(e) => setRegistration((v) => ({ ...v, division: e.target.value }))}
                  onBlur={() => setTouched((v) => ({ ...v, division: true }))}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                >
                  <option value="">Pilih divisi</option>
                  {WORK_DIVISIONS.map((division) => (
                    <option key={division}>{division}</option>
                  ))}
                </select>
                {touched.division && registerErrors.division && (
                  <p className="text-xs font-medium text-red-600">{registerErrors.division}</p>
                )}
              </div>
              <AuthField
                id="register-password"
                label="Kata Sandi"
                type="password"
                icon={<LockKeyhole className="size-4" />}
                value={registration.password}
                onChange={(e) => setRegistration((v) => ({ ...v, password: e.target.value }))}
                onBlur={() => setTouched((v) => ({ ...v, password: true }))}
                error={touched.password ? registerErrors.password : undefined}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
              />
              <AuthField
                id="register-confirm"
                label="Konfirmasi Kata Sandi"
                type="password"
                icon={<LockKeyhole className="size-4" />}
                value={registration.confirmPassword}
                onChange={(e) =>
                  setRegistration((v) => ({ ...v, confirmPassword: e.target.value }))
                }
                onBlur={() => setTouched((v) => ({ ...v, confirmPassword: true }))}
                error={touched.confirmPassword ? registerErrors.confirmPassword : undefined}
                placeholder="Ulangi kata sandi"
                autoComplete="new-password"
              />
              <div className="sm:col-span-2">
                <SubmitButton busy={busy}>Daftar Sekarang</SubmitButton>
              </div>
            </form>
          ) : user ? (
            <form onSubmit={submitPasswordUpdate} className="mt-7 space-y-5">
              <AuthField
                id="new-password"
                label="Kata Sandi Baru"
                type="password"
                icon={<LockKeyhole className="size-4" />}
                error={undefined}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
              />
              <AuthField
                id="confirm-new-password"
                label="Konfirmasi Kata Sandi Baru"
                type="password"
                icon={<LockKeyhole className="size-4" />}
                error={undefined}
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                placeholder="Ulangi kata sandi baru"
                autoComplete="new-password"
              />
              <SubmitButton busy={busy}>Simpan Kata Sandi</SubmitButton>
            </form>
          ) : (
            <div className="mt-7 space-y-4">
              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900" role="status">
                Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru dari halaman
                masuk.
              </p>
              <Button type="button" variant="outline" onClick={() => switchMode("login")}>
                Kembali ke halaman masuk
              </Button>
            </div>
          )}
          {mode !== "reset" && (
            <p className="mt-7 text-center text-sm text-slate-500">
              {mode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
              <button
                type="button"
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="min-h-11 font-semibold text-red-600 hover:text-red-700"
              >
                {mode === "login" ? "Daftar Sekarang" : "Masuk"}
              </button>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: string }) {
  return (
    <Button
      type="submit"
      disabled={busy}
      className="h-12 w-full rounded-xl bg-red-600 text-sm font-semibold shadow-lg shadow-red-600/20 hover:bg-red-700 active:translate-y-px disabled:opacity-70"
    >
      {busy ? (
        <>
          <LoaderCircle className="size-4 animate-spin" />
          Memproses…
        </>
      ) : (
        children
      )}
    </Button>
  );
}
