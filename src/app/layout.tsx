// app/layout.tsx
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Wanderlust Tours',
  description: 'Discover unforgettable travel experiences',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
          {children}
          <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}