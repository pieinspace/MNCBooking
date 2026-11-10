import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  CATEGORY_LABEL,
  HOURS,
  WORK_DIVISIONS,
  formatTimestampTime,
  studioImage,
  toMinutes,
  type Studio,
} from "@/lib/studio";
import { createBooking, getBusySlots } from "@/lib/studioService";

const today = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const PRODUCTION_TYPES = [
  "Live Streaming",
  "Rekaman Podcast",
  "Syuting Program",
  "Dubbing",
  "Rehearsal",
] as const;

const toTimestamp = (date: string, time: string) => {
  return new Date(`${date}T${time}:00+07:00`).toISOString();
};

export function BookingDialog({ studio, onClose }: { studio: Studio | null; onClose: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [date, setDate] = useState(today());
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("11:00");
  const [requesterName, setRequesterName] = useState("");
  const [picName, setPicName] = useState("");
  const [phone, setPhone] = useState("");
  const [division, setDivision] = useState("");
  const [productionType, setProductionType] = useState("");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!studio) return;
    setDate(today());
    setStart("09:00");
    setEnd("11:00");
    setRequesterName(String(user?.user_metadata["full_name"] ?? ""));
    setPicName(String(user?.user_metadata["full_name"] ?? ""));
    setPhone(String(user?.user_metadata["phone_number"] ?? ""));
    setDivision(String(user?.user_metadata["division"] ?? ""));
    setProductionType("");
    setDetails("");
  }, [studio, user]);

  const busy = useQuery({
    queryKey: ["busy", studio?.id, date],
    enabled: !!studio && !!date,
    queryFn: () => getBusySlots(studio!.id, date),
  });

  if (!studio) return null;

  const durationMinutes = toMinutes(end) - toMinutes(start);
  const selectedStart = date ? new Date(toTimestamp(date, start)).getTime() : 0;
  const selectedEnd = date ? new Date(toTimestamp(date, end)).getTime() : 0;
  const isPastStart = selectedStart <= Date.now();
  const clash = (busy.data ?? []).some(
    (booking) =>
      selectedStart < new Date(booking.end_time).getTime() &&
      selectedEnd > new Date(booking.start_time).getTime(),
  );
  const isPastDate = date < today();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast.info("Silakan masuk terlebih dahulu untuk mengajukan booking.");
      await navigate({
        to: "/auth",
        search: { redirect: undefined, reason: undefined, mode: undefined },
      });
      return;
    }
    if (durationMinutes <= 0) return void toast.error("Jam selesai harus setelah jam mulai.");
    if (isPastDate) return void toast.error("Tidak bisa memesan untuk tanggal yang sudah lewat.");
    if (isPastStart)
      return void toast.error("Jam mulai sudah lewat. Pilih waktu booking yang akan datang.");
    if (!requesterName.trim() || !picName.trim() || !phone.trim() || !division || !productionType) {
      return void toast.error(
        "Lengkapi nama pemohon, PIC, nomor kontak, divisi, dan keperluan produksi.",
      );
    }
    if (!/^\+?[0-9][0-9\s-]{7,14}$/.test(phone.trim())) {
      return void toast.error("Nomor WhatsApp atau telepon tidak valid.");
    }
    if (clash) return void toast.error("Jadwal studio sudah terisi pada rentang waktu tersebut.");

    setSaving(true);
    try {
      await createBooking({
        user_id: user.id,
        studio_id: studio.id,
        start_time: toTimestamp(date, start),
        end_time: toTimestamp(date, end),
        requester_name: requesterName.trim(),
        pic_name: picName.trim(),
        pic_contact: phone.trim(),
        division,
        production_purpose: details.trim()
          ? `${productionType} — ${details.trim()}`
          : productionType,
      });
      toast.success("Pengajuan booking terkirim — menunggu persetujuan admin.");
      await qc.invalidateQueries({ queryKey: ["busy"] });
      await qc.invalidateQueries({ queryKey: ["my-bookings"] });
      await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      onClose();
      await navigate({ to: "/bookings" });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" &&
              error !== null &&
              "message" in error &&
              typeof error.message === "string"
            ? error.message
            : "Gagal menyimpan pengajuan booking.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto gap-0 p-0">
        <div className="grid md:grid-cols-[0.85fr_1.15fr]">
          <div className="relative hidden bg-ink text-ink-foreground md:block">
            <img src={studioImage(studio)} alt={studio.name} className="h-48 w-full object-cover" />
            <div className="space-y-3 p-5">
              <p className="font-mono text-[0.7rem] uppercase tracking-widest opacity-70">
                {CATEGORY_LABEL[studio.category]} · {studio.location}
              </p>
              <h3 className="text-lg font-bold">{studio.name}</h3>
              <p className="text-sm opacity-80">{studio.description}</p>
              <p className="text-sm">Kapasitas hingga {studio.capacity} orang</p>
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {studio.facilities.map((facility) => (
                  <li
                    key={facility}
                    className="rounded-sm border border-ink-foreground/20 px-2 py-0.5 text-xs"
                  >
                    {facility}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle>Ajukan booking studio</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="booking-date">Tanggal</Label>
              <Input
                id="booking-date"
                type="date"
                min={today()}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
              {isPastDate && <p className="text-xs text-bad">Tanggal yang dipilih sudah lewat.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mulai</Label>
                <Select value={start} onValueChange={setStart}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.slice(0, -1).map((hour) => (
                      <SelectItem
                        key={hour}
                        value={hour}
                        disabled={new Date(toTimestamp(date, hour)).getTime() <= Date.now()}
                      >
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Selesai</Label>
                <Select value={end} onValueChange={setEnd}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.slice(1).map((hour) => (
                      <SelectItem key={hour} value={hour}>
                        {hour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {durationMinutes <= 0 && (
              <p className="text-xs text-bad">Jam selesai harus setelah jam mulai.</p>
            )}
            {isPastStart && !isPastDate && (
              <p className="text-xs text-bad">
                Jam mulai yang dipilih sudah lewat. Pilih waktu booking yang akan datang.
              </p>
            )}

            <div className="rounded-md border border-dashed p-3">
              <p className="eyebrow mb-2">Jadwal terisi · {date}</p>
              {busy.isLoading ? (
                <p className="text-xs text-muted-foreground">Memuat…</p>
              ) : busy.isError ? (
                <p className="text-xs text-bad">
                  Jadwal tidak dapat dimuat. Muat ulang sebelum mengajukan booking.
                </p>
              ) : busy.data?.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {busy.data.map((slot) => (
                    <li
                      key={`${slot.start_time}-${slot.end_time}`}
                      className="rounded-sm bg-bad-soft px-2 py-0.5 font-mono text-xs text-bad"
                    >
                      {formatTimestampTime(slot.start_time)}–{formatTimestampTime(slot.end_time)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-ok">Kosong sepanjang hari</p>
              )}
              {clash && (
                <p className="mt-2 text-xs font-medium text-bad">Waktu pilihan Anda bentrok.</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="booking-requester">Nama Pemohon</Label>
                <Input
                  id="booking-requester"
                  value={requesterName}
                  onChange={(event) => setRequesterName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="booking-pic">Nama PIC</Label>
                <Input
                  id="booking-pic"
                  value={picName}
                  onChange={(event) => setPicName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="booking-phone">Nomor Ekstensi / WhatsApp</Label>
                <Input
                  id="booking-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  autoComplete="tel"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Divisi / Unit Kerja</Label>
                <Select value={division} onValueChange={setDivision}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih divisi" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_DIVISIONS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Keperluan Produksi</Label>
                <Select value={productionType} onValueChange={setProductionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih keperluan" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCTION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="booking-details">
                Detail produksi <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Textarea
                id="booking-details"
                rows={2}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Nama program, nomor episode, atau catatan operasional"
              />
            </div>
            <div className="flex justify-end border-t pt-4">
              <Button
                type="submit"
                disabled={
                  saving ||
                  clash ||
                  durationMinutes <= 0 ||
                  isPastDate ||
                  busy.isLoading ||
                  busy.isError
                }
              >
                {saving ? "Mengirim…" : "Kirim pengajuan"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
