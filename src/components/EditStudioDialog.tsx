import { useEffect, useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  normalizeStudioAvailabilityStatus,
  type StudioAvailabilityStatus,
  type StudioCategory,
  type Studio,
} from "@/lib/studio";
import { updateStudio } from "@/lib/studioService";
import { CATEGORY_LABEL, WORK_DIVISIONS } from "@/lib/studio";

const CATEGORIES: StudioCategory[] = ["tv", "radio", "podcast", "dubbing", "green_screen"];

interface EditStudioDialogProps {
  studio: Studio;
  onSaved?: () => void;
}

export function EditStudioDialog({ studio, onSaved }: EditStudioDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(studio.name);
  const [category, setCategory] = useState<StudioCategory>(studio.category);
  const [capacity, setCapacity] = useState(String(studio.capacity));
  const [location, setLocation] = useState(studio.location);
  const [facilities, setFacilities] = useState(studio.facilities.join(", "));
  const [relatedDivisions, setRelatedDivisions] = useState(studio.related_divisions.join(", "));
  const [availabilityStatus, setAvailabilityStatus] = useState<StudioAvailabilityStatus | "">(
    normalizeStudioAvailabilityStatus(studio.availability_status) ?? "",
  );
  const [description, setDescription] = useState(studio.description);
  const [imageUrl, setImageUrl] = useState(studio.image_url ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(studio.name);
    setCategory(studio.category);
    setCapacity(String(studio.capacity));
    setLocation(studio.location);
    setFacilities(studio.facilities.join(", "));
    setRelatedDivisions(studio.related_divisions.join(", "));
    setAvailabilityStatus(normalizeStudioAvailabilityStatus(studio.availability_status) ?? "");
    setDescription(studio.description);
    setImageUrl(studio.image_url ?? "");
    setError("");
  }, [open, studio]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedCapacity = Number(capacity);
    const parsedFacilities = facilities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const parsedDivisions = relatedDivisions
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (
      !name.trim() ||
      !Number.isInteger(parsedCapacity) ||
      parsedCapacity < 1 ||
      parsedFacilities.length === 0 ||
      !availabilityStatus ||
      !description.trim()
    ) {
      setError("Lengkapi semua field wajib dengan nilai yang valid.");
      return;
    }

    setSaving(true);
    try {
      await updateStudio(studio.id, {
        name: name.trim(),
        category,
        capacity: parsedCapacity,
        facilities: parsedFacilities,
        related_divisions: parsedDivisions,
        location: location.trim(),
        availability_status: availabilityStatus,
        is_active: true,
        description: description.trim(),
        image_url: imageUrl.trim() || null,
      });
      setOpen(false);
      onSaved?.();
      toast.success("Data studio berhasil diperbarui!");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Data studio gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Edit ${studio.name}`}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Studio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Studio</DialogTitle>
          <DialogDescription>Perbarui informasi dan ketersediaan studio.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="edit-studio-name">
              Nama Studio
            </label>
            <Input
              id="edit-studio-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="edit-studio-category">
              Kategori / Tipe
            </label>
            <select
              id="edit-studio-category"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={category}
              onChange={(event) => setCategory(event.target.value as StudioCategory)}
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {CATEGORY_LABEL[item]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="edit-studio-status">
              Status Ketersediaan
            </label>
            <select
              id="edit-studio-status"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
              value={availabilityStatus}
              onChange={(event) =>
                setAvailabilityStatus(normalizeStudioAvailabilityStatus(event.target.value) ?? "")
              }
            >
              <option value="" disabled>
                Pilih status
              </option>
              <option value="available">Tersedia</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="edit-studio-location">
              Lokasi
            </label>
            <Input
              id="edit-studio-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="edit-studio-capacity">
              Kapasitas
            </label>
            <Input
              id="edit-studio-capacity"
              type="number"
              min="1"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="edit-studio-divisions">
              Divisi Terkait
            </label>
            <Input
              id="edit-studio-divisions"
              placeholder={WORK_DIVISIONS.slice(0, 3).join(", ")}
              value={relatedDivisions}
              onChange={(event) => setRelatedDivisions(event.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="edit-studio-facilities">
              Fasilitas Utama
            </label>
            <Input
              id="edit-studio-facilities"
              placeholder="AC, Soundproof, Lighting Set"
              value={facilities}
              onChange={(event) => setFacilities(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="edit-studio-description">
              Deskripsi Studio
            </label>
            <Textarea
              id="edit-studio-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="edit-studio-image">
              URL Foto / Thumbnail
            </label>
            <Input
              id="edit-studio-image"
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>
          {error && (
            <p className="text-sm text-destructive sm:col-span-2" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan Perubahan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
