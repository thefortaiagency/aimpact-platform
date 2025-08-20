import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Impact - Unified Communication Platform',
  description: 'AI-powered unified communication and support platform',
};

export default function ImpactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
    </>
  );
}