import React from "react";
import { cn } from "@/lib/utils";

interface PremiumHighlightedCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  imageSrc?: string;
  imageAlt?: string;
  tags?: string[];
  buttonText?: string;
  buttonHref?: string;
  onClick?: () => void;
}

export function PremiumHighlightedCard({
  children,
  className,
  title,
  description,
  imageSrc,
  imageAlt,
  tags = [],
  buttonText = "Learn More",
  buttonHref = "#",
  onClick,
  ...props
}: PremiumHighlightedCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col sm:flex-row min-h-[280px] bg-gradient-to-br from-[#D4AF38]/10 via-white/5 to-[#D4AF38]/10 hover:from-[#D4AF38]/40 hover:via-white/15 hover:to-[#D4AF38]/40 p-[2px] hover:p-[3px] rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group",
        className
      )}
      onClick={onClick}
      {...props}
    >
      <div className="flex flex-col sm:flex-row h-full w-full bg-white/5 group-hover:bg-white/15 backdrop-blur-xl rounded-[calc(1rem-2px)] border border-[#D4AF38]/20 group-hover:border-2 group-hover:border-[#D4AF38]/80 overflow-hidden transition-all duration-300">
        {imageSrc && (
          <img
            src={imageSrc}
            alt={imageAlt || ""}
            className="h-48 sm:h-full w-full sm:w-48 object-cover object-center flex-shrink-0 rounded-t-[calc(1rem-2px)] sm:rounded-l-[calc(1rem-2px)] sm:rounded-tr-none"
          />
        )}
        <div className="p-6 flex-1 flex flex-col justify-between min-w-0">
          <div>
            {title && (
              <h3 className="text-xl font-bold text-[#D4AF38] group-hover:text-[#FFD700] mb-2 transition-colors duration-300">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-gray-100 group-hover:text-white mb-4 text-sm leading-relaxed transition-colors duration-300">
                {description}
              </p>
            )}
            {tags.length > 0 && (
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
            )}
            {children}
          </div>
          {buttonText && buttonHref && (
            <div className="flex justify-end mt-auto">
              <a
                href={buttonHref}
                className="px-6 py-3 rounded-lg font-bold flex items-center border border-[#D4AF38] transition-all duration-300 text-[#D4AF38] bg-white/10 backdrop-blur-md hover:bg-[#C0C0C0] hover:text-black hover:border-[#C0C0C0] shadow-lg inline-flex"
              >
                {buttonText}
                <svg
                  className="h-4 w-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
