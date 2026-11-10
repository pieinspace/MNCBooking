import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  integer,
  pgEnum,
  pgPolicy,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const authUsers = pgSchema("auth").table("users", {
  id: uuid("id").primaryKey(),
});

export const appRole = pgEnum("app_role", ["user", "admin"]);
export const studioCategory = pgEnum("studio_category", [
  "tv",
  "radio",
  "podcast",
  "dubbing",
  "green_screen",
]);
export const studioAvailability = pgEnum("studio_availability", ["available", "maintenance"]);
export const bookingStatus = pgEnum("booking_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    full_name: text("full_name").notNull().default(""),
    email: text("email").notNull().default(""),
    phone_number: text("phone_number").notNull().default(""),
    division: text("division").notNull().default(""),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.id],
      foreignColumns: [authUsers.id],
      name: "profiles_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("own profile read", {
      for: "select",
      to: "authenticated",
      using: sql`${table.id} = auth.uid() or public.is_staff(auth.uid())`,
    }),
    pgPolicy("own profile update", {
      for: "update",
      to: "authenticated",
      using: sql`${table.id} = auth.uid()`,
      withCheck: sql`${table.id} = auth.uid()`,
    }),
  ],
).enableRLS();

export const userRoles = pgTable(
  "user_roles",
  {
    user_id: uuid("user_id").notNull(),
    role: appRole("role").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.user_id, table.role], name: "user_roles_pkey" }),
    pgPolicy("own roles read", {
      for: "select",
      to: "authenticated",
      using: sql`${table.user_id} = auth.uid() or public.has_role(auth.uid(), 'admin')`,
    }),
    pgPolicy("admin insert roles", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`public.has_role(auth.uid(), 'admin')`,
    }),
    pgPolicy("admin delete roles", {
      for: "delete",
      to: "authenticated",
      using: sql`public.has_role(auth.uid(), 'admin')`,
    }),
    foreignKey({
      columns: [table.user_id],
      foreignColumns: [authUsers.id],
      name: "user_roles_user_id_fkey",
    }).onDelete("cascade"),
  ],
).enableRLS();

export const studios = pgTable(
  "studios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: studioCategory("category").notNull(),
    description: text("description").notNull().default(""),
    location: text("location").notNull().default(""),
    capacity: integer("capacity").notNull().default(10),
    facilities: text("facilities")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    related_divisions: text("related_divisions")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    image_url: text("image_url"),
    availability_status: studioAvailability("availability_status").notNull().default("available"),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("studios_capacity_check", sql`${table.capacity} > 0`),
    pgPolicy("internal read active studios", {
      for: "select",
      to: "authenticated",
      using: sql`${table.is_active} or public.is_staff(auth.uid())`,
    }),
    pgPolicy("admin insert studios", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`public.is_staff(auth.uid())`,
    }),
    pgPolicy("admin update studios", {
      for: "update",
      to: "authenticated",
      using: sql`public.is_staff(auth.uid())`,
      withCheck: sql`public.is_staff(auth.uid())`,
    }),
    pgPolicy("admin delete studios", {
      for: "delete",
      to: "authenticated",
      using: sql`public.is_staff(auth.uid())`,
    }),
  ],
).enableRLS();

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .default(sql`auth.uid()`),
    studio_id: uuid("studio_id").notNull(),
    start_time: timestamp("start_time", { withTimezone: true, mode: "string" }).notNull(),
    end_time: timestamp("end_time", { withTimezone: true, mode: "string" }).notNull(),
    requester_name: text("requester_name").notNull().default(""),
    pic_name: text("pic_name").notNull().default(""),
    pic_contact: text("pic_contact").notNull().default(""),
    division: text("division").notNull().default(""),
    production_purpose: text("production_purpose").notNull().default(""),
    status: bookingStatus("status").notNull().default("pending"),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("bookings_valid_range_check", sql`${table.end_time} > ${table.start_time}`),
    pgPolicy("read own or staff", {
      for: "select",
      to: "authenticated",
      using: sql`${table.user_id} = auth.uid() or public.is_staff(auth.uid())`,
    }),
    pgPolicy("insert own", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`${table.user_id} = auth.uid()`,
    }),
    pgPolicy("update own or staff", {
      for: "update",
      to: "authenticated",
      using: sql`${table.user_id} = auth.uid() or public.is_staff(auth.uid())`,
      withCheck: sql`${table.user_id} = auth.uid() or public.is_staff(auth.uid())`,
    }),
    foreignKey({
      columns: [table.studio_id],
      foreignColumns: [studios.id],
      name: "bookings_studio_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.user_id],
      foreignColumns: [profiles.id],
      name: "bookings_user_id_fkey",
    }).onDelete("cascade"),
  ],
).enableRLS();

export const studioEquipment = pgTable(
  "studio_equipment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studio_id: uuid("studio_id").notNull(),
    item_name: text("item_name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    condition: text("condition").notNull().default("good"),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("studio_equipment_quantity_check", sql`${table.quantity} > 0`),
    foreignKey({
      columns: [table.studio_id],
      foreignColumns: [studios.id],
      name: "studio_equipment_studio_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("internal read equipment", {
      for: "select",
      to: "authenticated",
      using: sql`exists (select 1 from public.studios s where s.id = ${table.studio_id} and (s.is_active or public.is_staff(auth.uid())))`,
    }),
    pgPolicy("admin insert equipment", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`public.is_staff(auth.uid())`,
    }),
    pgPolicy("admin update equipment", {
      for: "update",
      to: "authenticated",
      using: sql`public.is_staff(auth.uid())`,
      withCheck: sql`public.is_staff(auth.uid())`,
    }),
    pgPolicy("admin delete equipment", {
      for: "delete",
      to: "authenticated",
      using: sql`public.is_staff(auth.uid())`,
    }),
  ],
).enableRLS();

export const bookingLogs = pgTable(
  "booking_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    booking_id: uuid("booking_id").notNull(),
    changed_by: uuid("changed_by"),
    action: text("action").notNull(),
    changed_at: timestamp("changed_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    previous_status: bookingStatus("previous_status"),
    new_status: bookingStatus("new_status"),
  },
  (table) => [
    foreignKey({
      columns: [table.booking_id],
      foreignColumns: [bookings.id],
      name: "booking_logs_booking_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.changed_by],
      foreignColumns: [authUsers.id],
      name: "booking_logs_changed_by_fkey",
    }).onDelete("set null"),
    pgPolicy("read own or staff booking logs", {
      for: "select",
      to: "authenticated",
      using: sql`public.is_staff(auth.uid()) or exists (select 1 from public.bookings b where b.id = ${table.booking_id} and b.user_id = auth.uid())`,
    }),
  ],
).enableRLS();

export type Profile = typeof profiles.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
export type StudioRow = typeof studios.$inferSelect;
export type BookingRow = typeof bookings.$inferSelect;
export type StudioEquipmentRow = typeof studioEquipment.$inferSelect;
export type BookingLogRow = typeof bookingLogs.$inferSelect;
