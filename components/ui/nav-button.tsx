// filepath: /components/ui/nav-button.tsx
import Link from "next/link";

interface NavButtonProps {
  href: string;
  title: string;
  subtitle: string;
  className?: string;
}

export function NavButton({ href, title, subtitle, className = "" }: NavButtonProps) {
  return (
    <Link href={href} className={`relative overflow-hidden group ${className}`}>
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#D4AF38]/50 rounded-xl p-4 flex flex-col items-center transition-all duration-300 hover:bg-white/10">
        <span className="text-[#D4AF38] font-bold text-lg mb-0.5">{title}</span>
        <span className="text-xs text-white/70">{subtitle}</span>
        <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF38]/0 via-[#D4AF38]/10 to-[#D4AF38]/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
      </div>
    </Link>
  );
}
