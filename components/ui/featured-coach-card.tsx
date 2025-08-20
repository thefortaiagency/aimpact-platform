import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface FeaturedCoachCardProps {
  name: string;
  imageSrc: string;
  imageAlt: string;
  description: string;
  tags: string[];
  profileHref: string;
}

export function FeaturedCoachCard({
  name,
  imageSrc,
  imageAlt,
  description,
  tags,
  profileHref
}: FeaturedCoachCardProps) {
  return (
    <div className="relative flex flex-col sm:flex-row min-h-[280px] bg-gradient-to-br from-[#D4AF38]/10 via-white/5 to-[#D4AF38]/10 hover:from-[#D4AF38]/40 hover:via-white/15 hover:to-[#D4AF38]/40 p-[2px] hover:p-[3px] rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group">
      <div className="flex flex-col sm:flex-row h-full w-full bg-white/5 group-hover:bg-white/15 backdrop-blur-xl rounded-[calc(1rem-2px)] border border-[#D4AF38]/20 group-hover:border-2 group-hover:border-[#D4AF38]/80 overflow-hidden transition-all duration-300">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="h-48 sm:h-full w-full sm:w-48 object-cover object-center flex-shrink-0 rounded-t-[calc(1rem-2px)] sm:rounded-l-[calc(1rem-2px)] sm:rounded-tr-none"
        />
        <div className="p-6 flex-1 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="text-xl font-bold text-[#D4AF38] group-hover:text-[#FFD700] mb-2 transition-colors duration-300">
              {name}
            </h3>
            <p className="text-gray-100 group-hover:text-white mb-4 text-sm leading-relaxed transition-colors duration-300">
              {description}
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-white/10 group-hover:bg-white/20 backdrop-blur-sm border border-white/20 group-hover:border-white/40 px-3 py-1 rounded-full text-xs text-gray-100 group-hover:text-white transition-all duration-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-end mt-auto">
            <Button asChild className="px-6 py-3 rounded-lg font-bold flex items-center border border-[#D4AF38] transition-all duration-300 text-[#D4AF38] bg-white/10 backdrop-blur-md hover:bg-[#C0C0C0] hover:text-black hover:border-[#C0C0C0] shadow-lg">
              <Link href={profileHref}>
                View Profile <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
