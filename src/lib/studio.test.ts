import { describe, expect, it } from "vitest";
import { normalizeStudioAvailabilityStatus } from "./studio";

describe("normalizeStudioAvailabilityStatus", () => {
  it("normalizes the Supabase availability enum case-insensitively", () => {
    expect(normalizeStudioAvailabilityStatus("AVAILABLE")).toBe("available");
    expect(normalizeStudioAvailabilityStatus("Maintenance")).toBe("maintenance");
  });

  it("returns null for null or unrecognized values", () => {
    expect(normalizeStudioAvailabilityStatus(null)).toBeNull();
    expect(normalizeStudioAvailabilityStatus("")).toBeNull();
    expect(normalizeStudioAvailabilityStatus("unknown")).toBeNull();
  });
});
