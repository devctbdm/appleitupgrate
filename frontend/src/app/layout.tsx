import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ClientLayout } from './ClientLayout';
import './globals.css';
import { Providers } from './providers';
import GoogleAnalytics from '@/components/GoogleAnalytics';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const appTitle = 'Apple IT Zone';
const appMainDescription =
  'Experience top-notch Apple repair services at unbeatable prices - online and in-store. From iPhones to Macs, we offer a wide range of services for all your Apple needs.';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: appTitle,
  description: appMainDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        'font-sans'
      )}
    >
      <body className="min-h-screen flex flex-col">
        <Providers>
          <GoogleAnalytics />
          <TooltipProvider>
            <ClientLayout>{children}</ClientLayout>
          </TooltipProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
