import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/lib/auth";
import { CATEGORY_LABEL, formatTimestampDate, formatTimestampTime } from "@/lib/studio";
import { getAllStudios, getMyBookings, updateBookingStatus } from "@/lib/studioService";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "Booking Saya — MNC Booking Studio" },
      { name: "description", content: "Riwayat dan status reservasi studio Anda." },
      { property: "og:title", content: "Booking Saya — MNC Booking Studio" },
      { property: "og:description", content: "Riwayat dan status reservasi studio Anda." },
    ],
  }),
  component: MyBookings,
});

function MyBookings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const {
    data = [],
    isLoading,
    isError: bookingsError,
    error: bookingsErrorDetail,
  } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: () => getMyBookings(user!.id),
  });
  const {
    data: studios = [],
    isError: studiosError,
    error: studiosErrorDetail,
  } = useQuery({
    queryKey: ["all-studios"],
    queryFn: getAllStudios,
  });

  const cancel = async (id: string) => {
    try {
      await updateBookingStatus(id, "cancelled");
      toast.success("Booking dibatalkan");
      await qc.invalidateQueries({ queryKey: ["my-bookings"] });
      await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking tidak dapat dibatalkan.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="eyebrow mb-2">Riwayat</p>
      <h1 className="mb-8 text-3xl font-extrabold">Booking saya</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Memuat…</p>
      ) : bookingsError ? (
        <p className="text-bad" role="alert">
          Booking gagal dimuat
          {bookingsErrorDetail instanceof Error ? `: ${bookingsErrorDetail.message}` : "."}
        </p>
      ) : studiosError ? (
        <p className="text-bad" role="alert">
          Daftar studio gagal dimuat
          {studiosErrorDetail instanceof Error ? `: ${studiosErrorDetail.message}` : "."}
        </p>
      ) : data.length === 0 ? (
        <div className="sheet p-10 text-center">
          <p className="mb-4 text-muted-foreground">Belum ada booking.</p>
          <Button asChild>
            <Link to="/">Lihat katalog studio</Link>
          </Button>
        </div>
      ) : (
        <ul className="sheet divide-y">
          {data.map((b) => {
            const studio = studios.find((item) => item.id === b.studio_id);
            return (
              <li
                key={b.id}
                className="grid gap-3 p-5 md:grid-cols-[10rem_1fr_auto_auto] md:items-center"
              >
                <div className="font-mono text-sm">
                  <p>{formatTimestampDate(b.start_time)}</p>
                  <p className="text-muted-foreground">
                    {formatTimestampTime(b.start_time)}–{formatTimestampTime(b.end_time)}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">{studio?.name ?? "Studio tidak ditemukan"}</p>
                  {studio && (
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY_LABEL[studio.category]}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">{b.production_purpose}</p>
                  <p className="text-xs text-muted-foreground">Pemohon: {b.requester_name}</p>
                  <p className="text-xs text-muted-foreground">
                    PIC: {b.pic_name} · {b.division} · {b.pic_contact}
                  </p>
                  {b.notes && <p className="mt-1 text-xs text-bad">Catatan admin: {b.notes}</p>}
                </div>
                <div className="text-right">
                  <StatusBadge status={b.status} />
                </div>
                <div className="md:w-24 md:text-right">
                  {b.status === "pending" && (
                    <Button size="sm" variant="ghost" onClick={() => cancel(b.id)}>
                      Batalkan
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
