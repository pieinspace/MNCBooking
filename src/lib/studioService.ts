import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { BookingStatus } from "@/lib/studio";

const STUDIO_SELECT =
  "id, name, category, description, location, capacity, facilities, related_divisions, image_url, availability_status, is_active, created_at";

export async function getStudios() {
  const { data, error } = await supabase
    .from("studios")
    .select(STUDIO_SELECT)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data;
}

export async function getAllStudios() {
  const { data, error } = await supabase.from("studios").select(STUDIO_SELECT).order("name");
  if (error) throw error;
  return data;
}

export async function addStudio(studio: TablesInsert<"studios">) {
  const { data, error } = await supabase
    .from("studios")
    .insert(studio)
    .select(STUDIO_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateStudio(id: string, studio: TablesUpdate<"studios">) {
  const { data, error } = await supabase
    .from("studios")
    .update(studio)
    .eq("id", id)
    .select(STUDIO_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function getBusySlots(studioId: string, date: string) {
  const { data, error } = await supabase.rpc("get_busy_slots", {
    _studio_id: studioId,
    _date: date,
  });
  if (error) throw error;
  return data;
}

export async function createBooking(booking: TablesInsert<"bookings">) {
  const { data, error } = await supabase.from("bookings").insert(booking).select("*").single();
  if (error) throw error;
  return data;
}

export async function getMyBookings(userId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .order("start_time", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  notes?: string | null,
) {
  const { data, error } = await supabase
    .from("bookings")
    .update({ status, notes: notes ?? null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
