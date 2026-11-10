import serbagunaImg from "@/assets/studio-serbaguna.jpg";
import sportsImg from "@/assets/studio-sports.jpg";
import newsImg from "@/assets/studio-news.jpg";
import {
  appRole,
  bookingStatus,
  studioCategory,
  studioAvailability,
  type BookingRow,
  type Profile as ProfileRow,
  type StudioRow,
  type UserRole as UserRoleRow,
} from "../../drizzle/schema";

export type AppRole = (typeof appRole.enumValues)[number];
export type StudioCategory = (typeof studioCategory.enumValues)[number];
export type StudioAvailabilityStatus = (typeof studioAvailability.enumValues)[number];
export type BookingStatus = (typeof bookingStatus.enumValues)[number];

export type Profile = ProfileRow;
export type UserRole = UserRoleRow;
export type Studio = StudioRow;
export type Booking = BookingRow;

export const normalizeStudioAvailabilityStatus = (
  value: string | null | undefined,
): StudioAvailabilityStatus | null => {
  const normalized = value?.trim().toLowerCase();
  return normalized === "available" || normalized === "maintenance" ? normalized : null;
};

export const WORK_DIVISIONS = [
  "RCTI",
  "MNCTV",
  "GTV",
  "iNews",
  "Production",
  "MNC Radio",
  "MNC Pictures",
  "MNC Animation",
] as const;
export type WorkDivision = (typeof WORK_DIVISIONS)[number];

export const CATEGORY_LABEL: Record<StudioCategory, string> = {
  tv: "TV",
  radio: "Radio",
  podcast: "Podcast",
  dubbing: "Dubbing",
  green_screen: "Green Screen",
};

const CATEGORY_IMG: Record<StudioCategory, string> = {
  tv: newsImg,
  radio: serbagunaImg,
  podcast: serbagunaImg,
  dubbing: serbagunaImg,
  green_screen: sportsImg,
};

export const studioImage = (studio: Pick<Studio, "image_url" | "category">) =>
  studio.image_url || CATEGORY_IMG[studio.category];

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

export const hhmm = (time: string) => time.slice(0, 5);

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00+07:00`));

export const formatTimestampDate = (timestamp: string) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(timestamp));

export const formatTimestampTime = (timestamp: string) =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(timestamp));

export const HOURS = Array.from(
  { length: 18 },
  (_, index) => `${String(index + 6).padStart(2, "0")}:00`,
);

export const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
};
