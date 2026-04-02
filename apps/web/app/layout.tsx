import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ScaleFeedback — Visual Bug Reporting for Teams',
  description: 'Capture, annotate, and manage feedback from your web apps with screenshots and technical metadata.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
