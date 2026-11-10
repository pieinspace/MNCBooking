import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/super-admin")({
  head: () => ({ meta: [{ title: "Administrasi — MNC Studio" }] }),
  component: LegacyAdminRedirect,
});

function LegacyAdminRedirect() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) void navigate({ to: isAdmin ? "/admin" : "/", replace: true });
  }, [isAdmin, loading, navigate]);

  return null;
}
