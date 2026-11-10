import { useState, type FormEvent } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StudioAvailabilityStatus, StudioCategory } from "@/lib/studio";
import { getVerifiedSession, hasAdminRole, useAuth } from "@/lib/auth";
import {
  CATEGORY_LABEL,
  formatTimestampDate,
  formatTimestampTime,
  STATUS_LABEL,
  type BookingStatus,
} from "@/lib/studio";
import {
  addStudio as addStudioRecord,
  getAllBookings,
  getAllStudios,
  updateBookingStatus,
} from "@/lib/studioService";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const session = await getVerifiedSession();
    if (!session) {
      throw redirect({
        to: "/auth",
        search: { redirect: "/admin", reason: undefined, mode: undefined },
      });
    }
    if (!(await hasAdminRole(session.user.id))) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Manajemen Booking — MNC Studio" },
      { name: "description", content: "Kelola pengajuan jadwal studio internal MNC Team." },
    ],
  }),
  component: AdminPage,
});

const TABS: (BookingStatus | "all")[] = ["pending", "approved", "rejected", "cancelled", "all"];
const STUDIO_TYPES: StudioCategory[] = ["tv", "radio", "podcast", "dubbing", "green_screen"];

interface StudioForm {
  name: string;
  type: StudioCategory;
  capacity: string;
  location: string;
  facilities: string;
  relatedDivisions: string;
  availability: StudioAvailabilityStatus;
  description: string;
  imageUrl: string;
}

const EMPTY_STUDIO_FORM: StudioForm = {
  name: "",
  type: "tv",
  capacity: "",
  location: "",
  facilities: "",
  relatedDivisions: "",
  availability: "available",
  description: "",
  imageUrl: "",
};

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<BookingStatus | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [studioDialogOpen, setStudioDialogOpen] = useState(false);
  const [studioForm, setStudioForm] = useState<StudioForm>(EMPTY_STUDIO_FORM);
  const [savingStudio, setSavingStudio] = useState(false);

  const {
    data = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-bookings"],
    enabled: isAdmin,
    queryFn: getAllBookings,
  });
  const { data: studios = [] } = useQuery({
    queryKey: ["all-studios"],
    enabled: isAdmin,
    queryFn: getAllStudios,
  });

  if (loading) return null;
  if (!isAdmin)
    return (
      <p className="p-12 text-center text-muted-foreground">Halaman ini khusus Admin MNC Team.</p>
    );

  const rows = data.filter((booking) => tab === "all" || booking.status === tab);
  const count = (status: BookingStatus) =>
    data.filter((booking) => booking.status === status).length;

  const decide = async (id: string, status: "approved" | "rejected") => {
    try {
      await updateBookingStatus(id, status, notes[id]?.trim() || null);
      toast.success(status === "approved" ? "Booking disetujui" : "Booking ditolak");
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["busy"] });
      void queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Status booking tidak dapat diperbarui.",
      );
    }
  };

  const addStudio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const capacity = Number(studioForm.capacity);
    const facilities = studioForm.facilities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const relatedDivisions = studioForm.relatedDivisions
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (
      !studioForm.name.trim() ||
      !studioForm.location.trim() ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      facilities.length === 0 ||
      !studioForm.description.trim()
    ) {
      toast.error("Lengkapi semua field studio dengan nilai yang valid.");
      return;
    }
    setSavingStudio(true);
    try {
      await addStudioRecord({
        name: studioForm.name,
        category: studioForm.type,
        capacity,
        location: studioForm.location.trim(),
        is_active: true,
        facilities,
        related_divisions: relatedDivisions,
        availability_status: studioForm.availability,
        description: studioForm.description,
        image_url: studioForm.imageUrl.trim() || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["studios"] });
      await queryClient.invalidateQueries({ queryKey: ["all-studios"] });
      toast.success("Studio baru berhasil ditambahkan");
      setStudioForm(EMPTY_STUDIO_FORM);
      setStudioDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Studio gagal disimpan.");
    } finally {
      setSavingStudio(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Operasional Internal · Admin</p>
          <h1 className="text-3xl font-extrabold">Manajemen booking</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tinjau dan kelola jadwal produksi MNC Team.
          </p>
        </div>
        <Dialog open={studioDialogOpen} onOpenChange={setStudioDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Tambah Studio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Studio Baru</DialogTitle>
              <DialogDescription>
                Informasi studio akan tersimpan di Supabase dan langsung tampil pada katalog.
              </DialogDescription>
            </DialogHeader>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={addStudio}>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="studio-name">
                  Nama Studio
                </label>
                <Input
                  id="studio-name"
                  value={studioForm.name}
                  onChange={(event) => setStudioForm({ ...studioForm, name: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="studio-type">
                  Tipe / Kategori
                </label>
                <select
                  id="studio-type"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={studioForm.type}
                  onChange={(event) =>
                    setStudioForm({
                      ...studioForm,
                      type: event.target.value as StudioCategory,
                    })
                  }
                >
                  {STUDIO_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {CATEGORY_LABEL[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="studio-location">
                  Lokasi
                </label>
                <Input
                  id="studio-location"
                  value={studioForm.location}
                  onChange={(event) =>
                    setStudioForm({ ...studioForm, location: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="studio-capacity">
                  Kapasitas (orang)
                </label>
                <Input
                  id="studio-capacity"
                  type="number"
                  min="1"
                  step="1"
                  value={studioForm.capacity}
                  onChange={(event) =>
                    setStudioForm({ ...studioForm, capacity: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="studio-status">
                  Status Ketersediaan
                </label>
                <select
                  id="studio-status"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={studioForm.availability}
                  onChange={(event) =>
                    setStudioForm({
                      ...studioForm,
                      availability: event.target.value as StudioAvailabilityStatus,
                    })
                  }
                >
                  <option value="available">Tersedia</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="studio-facilities">
                  Fasilitas Utama (pisahkan koma)
                </label>
                <Input
                  id="studio-facilities"
                  placeholder="AC, Soundproof, Lighting Set, Kamera 4K"
                  value={studioForm.facilities}
                  onChange={(event) =>
                    setStudioForm({ ...studioForm, facilities: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="studio-related-divisions">
                  Divisi Terkait
                </label>
                <Input
                  id="studio-related-divisions"
                  placeholder="RCTI, Production"
                  value={studioForm.relatedDivisions}
                  onChange={(event) =>
                    setStudioForm({ ...studioForm, relatedDivisions: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="studio-description">
                  Deskripsi
                </label>
                <Textarea
                  id="studio-description"
                  value={studioForm.description}
                  onChange={(event) =>
                    setStudioForm({ ...studioForm, description: event.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-medium" htmlFor="studio-image">
                  URL Foto Studio
                </label>
                <Input
                  id="studio-image"
                  type="url"
                  placeholder="https://…"
                  value={studioForm.imageUrl}
                  onChange={(event) =>
                    setStudioForm({ ...studioForm, imageUrl: event.target.value })
                  }
                />
              </div>
              <Button className="sm:col-span-2" type="submit" disabled={savingStudio}>
                {savingStudio ? "Menyimpan…" : "Simpan Studio"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={tab === status ? "default" : "outline"}
            onClick={() => setTab(status)}
          >
            {status === "all" ? "Semua" : STATUS_LABEL[status]}
            {status !== "all" && (
              <span className="ml-1 font-mono text-xs opacity-70">{count(status)}</span>
            )}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Memuat booking…</p>
      ) : isError ? (
        <p className="text-bad" role="alert">
          Data booking Supabase gagal dimuat{error instanceof Error ? `: ${error.message}` : "."}
        </p>
      ) : rows.length === 0 ? (
        <div className="sheet p-10 text-center text-muted-foreground">
          Tidak ada booking di kategori ini.
        </div>
      ) : (
        <div className="sheet overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal / Jam</TableHead>
                <TableHead>Studio</TableHead>
                <TableHead>Divisi / PIC</TableHead>
                <TableHead>Keperluan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((booking) => {
                const studio = studios.find((item) => item.id === booking.studio_id);
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="min-w-36">
                      <p className="font-medium">{formatTimestampDate(booking.start_time)}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatTimestampTime(booking.start_time)}–
                        {formatTimestampTime(booking.end_time)}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-36">
                      <p className="font-semibold">{studio?.name ?? "Studio tidak ditemukan"}</p>
                      {studio && (
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_LABEL[studio.category]}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="min-w-44">
                      <p>{booking.division}</p>
                      <p className="text-xs text-muted-foreground">
                        Pemohon: {booking.requester_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PIC: {booking.pic_name} · {booking.pic_contact}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-44">
                      <p>{booking.production_purpose}</p>
                      {booking.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Catatan: {booking.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status} />
                    </TableCell>
                    <TableCell className="min-w-52">
                      {booking.status === "pending" && (
                        <div className="flex flex-col gap-2">
                          <Input
                            aria-label={`Catatan untuk ${booking.pic_name}`}
                            placeholder="Catatan (opsional)"
                            value={notes[booking.id] ?? ""}
                            onChange={(event) =>
                              setNotes({ ...notes, [booking.id]: event.target.value })
                            }
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => decide(booking.id, "rejected")}
                            >
                              <X className="mr-1 size-4" />
                              Tolak
                            </Button>
                            <Button size="sm" onClick={() => void decide(booking.id, "approved")}>
                              <Check className="mr-1 size-4" />
                              Setujui
                            </Button>
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
