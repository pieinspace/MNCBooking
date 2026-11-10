import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Search, Users } from "lucide-react";
import { BookingDialog } from "@/components/BookingDialog";
import { EditStudioDialog } from "@/components/EditStudioDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { getVerifiedSession, hasAdminRole } from "@/lib/auth";
import {
  CATEGORY_LABEL,
  normalizeStudioAvailabilityStatus,
  studioImage,
  type Studio,
  type StudioCategory,
} from "@/lib/studio";
import { getStudios } from "@/lib/studioService";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const session = await getVerifiedSession();
    if (!session) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.pathname, reason: "catalog", mode: undefined },
      });
    }
    return { isAdmin: await hasAdminRole(session.user.id) };
  },
  head: () => ({
    meta: [
      { title: "Katalog Studio Internal — MNC Studio" },
      { name: "description", content: "Katalog dan jadwal studio produksi internal MNC Team." },
      { property: "og:title", content: "Katalog Studio Internal — MNC Studio" },
      { property: "og:description", content: "Katalog studio produksi internal MNC Team." },
    ],
  }),
  component: Index,
});

const FILTERS: (StudioCategory | "all")[] = [
  "all",
  "tv",
  "radio",
  "podcast",
  "dubbing",
  "green_screen",
];

function Index() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<StudioCategory | "all">("all");
  const [selected, setSelected] = useState<Studio | null>(null);

  const {
    data: studios = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["studios"],
    queryFn: getStudios,
  });

  const visibleStudios = useMemo(
    () =>
      studios.filter(
        (studio) =>
          (category === "all" || studio.category === category) &&
          [studio.name, studio.description, studio.location, ...studio.facilities]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [studios, query, category],
  );

  const refreshStudios = () => {
    void queryClient.invalidateQueries({ queryKey: ["studios"] });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20">
      <section className="grid gap-8 border-b py-12 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <p className="eyebrow mb-4 flex items-center gap-2">
            <span className="on-air-dot" /> MNC Team · Studio internal
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.05] md:text-6xl">
            Ruang produksi.
            <br />
            Jadwal terkoordinasi.
          </h1>
        </div>
        <p className="text-muted-foreground md:pb-2">
          {isAdmin
            ? "Kelola informasi studio dan pantau jadwal operasional internal MNC Team."
            : "Pilih studio, cek slot yang tersedia, lalu ajukan kebutuhan produksi. Admin internal akan membantu mengelola jadwal."}
        </p>
      </section>

      <div className="flex flex-col gap-4 py-6">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((filter) => (
            <Button
              key={filter}
              size="sm"
              variant={category === filter ? "default" : "outline"}
              onClick={() => setCategory(filter)}
            >
              {filter === "all" ? "Semua" : CATEGORY_LABEL[filter]}
            </Button>
          ))}
        </div>
        <div className="relative sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari studio atau fasilitas…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="py-20 text-center text-muted-foreground">Memuat katalog…</p>
      ) : isError ? (
        <div className="py-20 text-center text-bad" role="alert">
          <p>Katalog Supabase gagal dimuat{error instanceof Error ? `: ${error.message}` : "."}</p>
          <Button className="mt-4" variant="outline" onClick={refreshStudios}>
            Coba lagi
          </Button>
        </div>
      ) : visibleStudios.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">Tidak ada studio yang cocok.</p>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {visibleStudios.map((studio) => {
            const status = normalizeStudioAvailabilityStatus(studio.availability_status);
            return (
              <li key={studio.id} className="sheet overflow-hidden">
                <img
                  src={studioImage(studio)}
                  alt={studio.name}
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="eyebrow">{CATEGORY_LABEL[studio.category]}</p>
                      <h2 className="mt-1 text-xl font-bold">{studio.name}</h2>
                    </div>
                    <span
                      className={
                        status === "available"
                          ? "rounded-full bg-ok-soft px-3 py-1 text-xs font-semibold text-ok"
                          : status === "maintenance"
                            ? "rounded-full bg-pending-soft px-3 py-1 text-xs font-semibold text-pending"
                            : "rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
                      }
                    >
                      {status === "available"
                        ? "Tersedia"
                        : status === "maintenance"
                          ? "Maintenance"
                          : "Status belum diatur"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{studio.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {studio.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      Kapasitas {studio.capacity} orang
                    </span>
                  </div>
                  <ul className="flex flex-wrap gap-1.5">
                    {studio.facilities.map((facility) => (
                      <li key={facility} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                        {facility}
                      </li>
                    ))}
                  </ul>
                  <div>
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">
                      Divisi terkait
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {studio.related_divisions.map((division) => (
                        <li key={division} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                          {division}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    {isAdmin && <EditStudioDialog studio={studio} onSaved={refreshStudios} />}
                    {!isAdmin && status === "available" && (
                      <Button onClick={() => setSelected(studio)}>Ajukan booking</Button>
                    )}
                    {!isAdmin && status !== "available" && (
                      <span className="self-center text-sm text-muted-foreground">
                        {status === "maintenance"
                          ? "Tidak tersedia untuk booking"
                          : "Status studio belum diketahui"}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {selected && !isAdmin && (
        <BookingDialog studio={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
