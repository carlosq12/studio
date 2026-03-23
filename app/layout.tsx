import type { Metadata } from 'next';
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ToasterProvider } from '@/components/toaster-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Centro de Gestión de Personal',
  description: 'Un centro centralizado para gestionar datos personales y de equipo de manera eficiente.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-background')}>
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
        <ToasterProvider />
      </body>
    </html>
  );
}
