import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const linkCls = "text-sm text-muted-foreground hover:text-foreground transition-colors";
const activeCls = { className: "text-sm text-foreground font-medium" };

export function Navbar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    try {
      await logout();
      navigate({
        to: "/auth",
        search: { redirect: undefined, reason: undefined, mode: undefined },
        replace: true,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal keluar dari akun.");
    }
  };

  if (pathname === "/auth") return null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="on-air-dot" />
          <span className="font-display text-base font-extrabold tracking-tight">MNC Studio</span>
          <span className="eyebrow hidden sm:inline">Booking</span>
        </Link>
        <nav className="flex flex-1 items-center gap-5">
          {user && (
            <Link
              to="/"
              className={linkCls}
              activeProps={activeCls}
              activeOptions={{ exact: true }}
            >
              Katalog
            </Link>
          )}
          {user && !isAdmin && (
            <Link to="/bookings" className={linkCls} activeProps={activeCls}>
              Booking Saya
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className={linkCls} activeProps={activeCls}>
              Verifikasi
            </Link>
          )}
        </nav>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground md:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="Keluar">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button asChild size="sm">
            <Link to="/auth" search={{ redirect: undefined, reason: undefined, mode: undefined }}>
              Masuk
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
