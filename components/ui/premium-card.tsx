import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

// A reusable premium glass card component with gold header
export function PremiumCard({
  title,
  description,
  children,
  footer,
  className = "",
  ...props
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  [key: string]: any;
}) {
  return (
    <Card
      className={
        "bg-white/10 border border-transparent hover:border-[#D4AF38]/70 transition-colors duration-300 backdrop-blur-md shadow-lg rounded-xl " +
        className
      }
      {...props}
    >
      <CardHeader>
        <CardTitle className="text-[#D4AF38]">{title}</CardTitle>
        {description && <CardDescription className="text-white/80">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
