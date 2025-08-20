interface FeaturedCoachesHeaderProps {
  title: string;
  subtitle: string;
}

export function FeaturedCoachesHeader({ title, subtitle }: FeaturedCoachesHeaderProps) {
  return (
    <div className="text-center mb-8">
      <h2 className="text-3xl font-bold text-[#D4AF38] mb-2">{title}</h2>
      <p className="text-gray-100 text-lg">{subtitle}</p>
    </div>
  );
}
