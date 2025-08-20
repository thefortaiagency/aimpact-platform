import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PremiumCard } from "@/components/ui/premium-card";
import { ArrowRight } from "lucide-react";

interface BrowseAllCoachesCardProps {
  title: string;
  description: string;
  content: string;
  buttonText: string;
  buttonHref: string;
}

export function BrowseAllCoachesCard({
  title,
  description,
  content,
  buttonText,
  buttonHref
}: BrowseAllCoachesCardProps) {
  return (
    <PremiumCard
      title={title}
      description={description}
    >
      <div className="text-white/90 text-base mb-6">
        <p>{content}</p>
      </div>
      <div className="flex justify-center">
        <Button asChild className="px-8 py-3 rounded-lg font-bold flex items-center border border-[#D4AF38] transition-all duration-300 text-[#D4AF38] bg-white/10 backdrop-blur-md hover:bg-[#C0C0C0] hover:text-black hover:border-[#C0C0C0] shadow-lg">
          <Link href={buttonHref}>
            {buttonText} <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </PremiumCard>
  );
}
