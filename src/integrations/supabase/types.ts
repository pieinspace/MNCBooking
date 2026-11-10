export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Row<T> = T;
type Insert<T, Optional extends keyof T> = Omit<T, Optional> & Partial<Pick<T, Optional>>;
type Update<T> = Partial<T>;

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      bookings: {
        Row: Row<{
          id: string;
          user_id: string;
          studio_id: string;
          start_time: string;
          end_time: string;
          requester_name: string;
          pic_name: string;
          pic_contact: string;
          division: string;
          production_purpose: string;
          status: Database["public"]["Enums"]["booking_status"];
          notes: string | null;
          created_at: string;
        }>;
        Insert: Insert<
          Database["public"]["Tables"]["bookings"]["Row"],
          | "id"
          | "user_id"
          | "requester_name"
          | "pic_name"
          | "pic_contact"
          | "division"
          | "production_purpose"
          | "status"
          | "notes"
          | "created_at"
        >;
        Update: Update<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "bookings_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_logs: {
        Row: {
          id: string;
          booking_id: string;
          changed_by: string | null;
          action: string;
          changed_at: string;
          previous_status: Database["public"]["Enums"]["booking_status"] | null;
          new_status: Database["public"]["Enums"]["booking_status"] | null;
        };
        Insert: Insert<
          Database["public"]["Tables"]["booking_logs"]["Row"],
          "id" | "changed_by" | "changed_at" | "previous_status" | "new_status"
        >;
        Update: Update<Database["public"]["Tables"]["booking_logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "booking_logs_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone_number: string;
          division: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Insert<
          Database["public"]["Tables"]["profiles"]["Row"],
          "full_name" | "email" | "phone_number" | "division" | "created_at" | "updated_at"
        >;
        Update: Update<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      studio_equipment: {
        Row: {
          id: string;
          studio_id: string;
          item_name: string;
          quantity: number;
          condition: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Insert<
          Database["public"]["Tables"]["studio_equipment"]["Row"],
          "id" | "quantity" | "condition" | "notes" | "created_at"
        >;
        Update: Update<Database["public"]["Tables"]["studio_equipment"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "studio_equipment_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      studios: {
        Row: {
          id: string;
          name: string;
          category: Database["public"]["Enums"]["studio_category"];
          description: string;
          location: string;
          capacity: number;
          facilities: string[];
          related_divisions: string[];
          image_url: string | null;
          availability_status: Database["public"]["Enums"]["studio_availability"];
          is_active: boolean;
          created_at: string;
        };
        Insert: Insert<
          Database["public"]["Tables"]["studios"]["Row"],
          | "id"
          | "description"
          | "location"
          | "capacity"
          | "facilities"
          | "related_divisions"
          | "image_url"
          | "availability_status"
          | "is_active"
          | "created_at"
        >;
        Update: Update<Database["public"]["Tables"]["studios"]["Insert"]>;
        Relationships: [];
      };
      user_roles: {
        Row: {
          user_id: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        Insert: Database["public"]["Tables"]["user_roles"]["Row"];
        Update: Update<Database["public"]["Tables"]["user_roles"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_busy_slots: {
        Args: { _date: string; _studio_id: string };
        Returns: {
          end_time: string;
          start_time: string;
          status: Database["public"]["Enums"]["booking_status"];
        }[];
      };
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string };
        Returns: boolean;
      };
      is_staff: { Args: { _user_id: string }; Returns: boolean };
    };
    Enums: {
      app_role: "user" | "admin";
      booking_status: "pending" | "approved" | "rejected" | "cancelled";
      studio_availability: "available" | "maintenance";
      studio_category: "tv" | "radio" | "podcast" | "dubbing" | "green_screen";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals["public"];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin"],
      booking_status: ["pending", "approved", "rejected", "cancelled"],
      studio_availability: ["available", "maintenance"],
      studio_category: ["tv", "radio", "podcast", "dubbing", "green_screen"],
    },
  },
} as const;
