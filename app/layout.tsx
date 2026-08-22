import type { Metadata } from 'next';
import { archivoBlack, spaceGrotesk } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mooolah Tracker',
  description: 'Personal finance dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body className={`${archivoBlack.variable} ${spaceGrotesk.variable} antialiased min-h-screen`}>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}` }} />
        {children}
      </body>
    </html>
  );
}
