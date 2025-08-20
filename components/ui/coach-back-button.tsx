import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface CoachBackButtonProps {
  href: string;
  children: React.ReactNode;
}

export function CoachBackButton({ href, children }: CoachBackButtonProps) {
  return (
    <div className="flex justify-end mb-6">
      <Button asChild className="px-6 py-3 rounded-lg font-bold flex items-center border border-[#D4AF38] transition-all duration-300 text-[#D4AF38] bg-white/10 backdrop-blur-md hover:bg-[#C0C0C0] hover:text-black hover:border-[#C0C0C0] shadow-lg">
        <Link href={href}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {children}
        </Link>
      </Button>
    </div>
  );
}
