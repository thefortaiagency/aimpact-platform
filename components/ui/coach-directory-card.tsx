// filepath: /components/ui/coach-directory-card.tsx
import Image from "next/image";
import Link from "next/link";

interface CoachDirectoryCardProps {
  id: string;
  name: string;
  title: string;
  image?: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  yearsExperience: string;
  availableNow: boolean;
  price: string;
  className?: string;
}

export function CoachDirectoryCard({
  id,
  name,
  title,
  image,
  specialty,
  rating,
  reviewCount,
  yearsExperience,
  availableNow,
  price,
  className = ""
}: CoachDirectoryCardProps) {
  return (
    <div className={`bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#D4AF38]/30 rounded-xl p-6 transition-all duration-300 hover:bg-white/10 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-20 h-20 bg-white/10 rounded-xl flex-shrink-0 overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={name}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[#D4AF38] text-sm font-bold">IMG</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2">
            <h3 className="text-lg font-bold text-white">{name}</h3>
            <span className="text-[#D4AF38] font-bold text-sm">{price}</span>
          </div>
          <p className="text-[#D4AF38] text-sm font-medium mb-2">{title}</p>
          <p className="text-white/80 text-sm mb-3">Specialty: {specialty}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="bg-[#D4AF38]/20 text-[#D4AF38] text-xs px-2 py-1 rounded-full">
              {yearsExperience} Years
            </span>
            {availableNow && (
              <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                Available Now
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="text-yellow-400 text-sm">★</span>
              <span className="text-white text-sm">{rating}</span>
              <span className="text-white/60 text-xs">({reviewCount} reviews)</span>
            </div>
            <Link href={`/streaming/vCoach/coaches/wrestling/${id}`}>
              <button className="bg-[#D4AF38]/20 hover:bg-[#D4AF38]/30 border border-[#D4AF38]/50 hover:border-[#D4AF38] text-[#D4AF38] hover:text-white px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200">
                View Profile
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
