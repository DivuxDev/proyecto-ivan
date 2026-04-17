import type { Metadata, Viewport } from 'next';
import './globals.css';
import { QueryProvider } from './providers';

export const metadata: Metadata = {
  title: 'LineasCampo',
  description: 'Gestión de trabajos de campo para empresas de líneas eléctricas',
  applicationName: 'LineasCampo',
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
