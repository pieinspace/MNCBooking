import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

const authState = vi.hoisted(() => ({
  session: null as { user: { id: string; email: string } } | null,
  isAdmin: false,
}));

vi.mock("@/lib/auth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  getVerifiedSession: async () => authState.session,
  hasAdminRole: async () => authState.isAdmin,
  useAuth: () => ({
    user: authState.session?.user ?? null,
    isAdmin: authState.isAdmin,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock("@/lib/studioService", () => {
  const studios = [
    {
      id: "s1",
      name: "Studio TV 1",
      category: "tv",
      description: "",
      location: "MNC",
      capacity: 12,
      facilities: [],
      related_divisions: [],
      image_url: null,
      availability_status: "available",
      is_active: true,
      created_at: "",
    },
    {
      id: "s2",
      name: "Studio Radio/Podcast",
      category: "podcast",
      description: "",
      location: "MNC",
      capacity: 8,
      facilities: [],
      related_divisions: [],
      image_url: null,
      availability_status: "available",
      is_active: true,
      created_at: "",
    },
    {
      id: "s3",
      name: "Studio Dubbing",
      category: "dubbing",
      description: "",
      location: "MNC",
      capacity: 5,
      facilities: [],
      related_divisions: [],
      image_url: null,
      availability_status: "available",
      is_active: true,
      created_at: "",
    },
    {
      id: "s4",
      name: "Green Screen Room",
      category: "green_screen",
      description: "",
      location: "MNC",
      capacity: 10,
      facilities: [],
      related_divisions: [],
      image_url: null,
      availability_status: "maintenance",
      is_active: true,
      created_at: "",
    },
  ];
  return {
    getStudios: async () => studios,
    getAllStudios: async () => studios,
    getAllBookings: async () => [],
    getMyBookings: async () => [],
    getBusySlots: async () => [],
    addStudio: vi.fn(),
    updateStudio: vi.fn(),
    createBooking: vi.fn(),
    updateBookingStatus: vi.fn(),
  };
});

function renderAt(path: string) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  authState.session = null;
  authState.isAdmin = false;
});

describe("Supabase-authenticated routes", () => {
  it("redirects unauthenticated users from the catalog to login", async () => {
    const { container } = renderAt("/");

    await waitFor(() => expect(container.firstChild).not.toBeNull());
    expect(await screen.findByRole("heading", { name: "Masuk ke akun Anda" })).toBeInTheDocument();
    expect(
      await screen.findByText("Silakan masuk terlebih dahulu untuk melihat katalog studio"),
    ).toBeInTheDocument();
  });

  it("redirects non-admin users away from the admin dashboard", async () => {
    authState.session = { user: { id: "user-id", email: "user@mnc.com" } };

    renderAt("/admin");

    expect(await screen.findByPlaceholderText("Cari studio atau fasilitas…")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Manajemen booking" })).not.toBeInTheDocument();
  });

  it("allows an admin to manage studios without catalog booking actions", async () => {
    authState.session = { user: { id: "admin-id", email: "admin@mnc.com" } };
    authState.isAdmin = true;

    renderAt("/");

    expect(await screen.findByRole("link", { name: "Verifikasi" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Edit Studio TV 1" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Edit/ })).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Ajukan booking" })).not.toBeInTheDocument();
  });

  it("renders catalog availability from the Supabase availability_status column", async () => {
    authState.session = { user: { id: "user-id", email: "user@mnc.com" } };

    renderAt("/");

    expect(await screen.findAllByText("Tersedia")).toHaveLength(3);
    expect(screen.getByText("Maintenance")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Ajukan booking" })).toHaveLength(3);
  });

  it("allows an admin to load the admin dashboard", async () => {
    authState.session = { user: { id: "admin-id", email: "admin@mnc.com" } };
    authState.isAdmin = true;

    renderAt("/admin");

    expect(await screen.findByRole("heading", { name: "Manajemen booking" })).toBeInTheDocument();
  });

  it("renders the not-found route", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { container } = renderAt("/this-route-does-not-exist");

    await waitFor(() => expect(container.firstChild).not.toBeNull());
  });
});
