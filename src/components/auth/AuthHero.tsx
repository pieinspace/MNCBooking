import { Building2, CheckCircle2 } from "lucide-react";
import studioImage from "@/assets/studio-news.jpg";

interface AuthHeroProps {
  register?: boolean;
}

export function AuthHero({ register = false }: AuthHeroProps) {
  return (
    <aside className="relative hidden min-h-full overflow-hidden bg-slate-950 lg:flex lg:flex-col">
      <img
        src={studioImage}
        alt="Studio produksi MNC"
        className="absolute inset-0 size-full object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/75 to-red-950/70" />
      <div className="relative flex items-center gap-3 px-12 pt-10 text-white">
        <div className="flex size-11 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-950/40">
          <Building2 className="size-6" />
        </div>
        <div>
          <p className="font-bold tracking-tight">MNC Studio</p>
          <p className="text-xs text-slate-300">Booking Management</p>
        </div>
      </div>
      <div className="relative mt-auto px-12 pb-14 text-white">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-md">
          <span className="size-2 rounded-full bg-red-500 shadow-[0_0_12px_3px_rgba(239,68,68,.6)]" />{" "}
          Sistem booking terintegrasi
        </div>
        <h1 className="max-w-xl text-5xl font-bold leading-[1.05] tracking-tight">
          {register
            ? "Mulai produksi dengan lebih cepat."
            : "Internal Studio Production Management."}
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
          Satu platform internal MNC Team untuk memesan ruang produksi, mengelola jadwal, dan
          menjaga tim tetap sinkron.
        </p>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-200">
          {["Jadwal real-time", "Verifikasi terpusat", "Akses aman"].map((item) => (
            <span key={item} className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-red-400" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
