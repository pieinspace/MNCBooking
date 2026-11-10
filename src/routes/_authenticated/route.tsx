import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getVerifiedSession } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (!(await getVerifiedSession())) {
      throw redirect({
        to: "/auth",
        search: {
          redirect: location.pathname + location.searchStr + location.hash,
          reason: undefined,
          mode: undefined,
        },
      });
    }
    return {};
  },
  component: () => <Outlet />,
});
