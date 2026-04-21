import type { Metadata, Viewport } from 'next';
import './globals.css';
import { QueryProvider } from './providers';

export const metadata: Metadata = {
  title: 'TagMap',
  description: 'Gestión de trabajos de campo geolocalizados',
  applicationName: 'TagMap',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#F59E0B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
