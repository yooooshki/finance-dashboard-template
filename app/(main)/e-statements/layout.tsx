import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'E-Statements — Mooolah Tracker' };

export default function EStatementsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
