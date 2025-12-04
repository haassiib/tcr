// app/layout.tsx
import { Inter } from 'next/font/google';
import '@/app/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Wanderlust Tours',
  description: 'Discover unforgettable travel experiences',
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
      <div className={inter.className}>
        <main>{children}</main>
      </div>
  );
}