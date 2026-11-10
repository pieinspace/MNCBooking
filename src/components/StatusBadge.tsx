import { cn } from "@/lib/utils";
import { STATUS_LABEL, type BookingStatus } from "@/lib/studio";

const STYLES: Record<BookingStatus, string> = {
  pending: "bg-pending-soft text-pending",
  approved: "bg-ok-soft text-ok",
  rejected: "bg-bad-soft text-bad",
  cancelled: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-wider",
        STYLES[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
