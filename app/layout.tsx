import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { AchievementsProvider } from '@/contexts/AchievementsContext'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'humkio — Gestión de Proyectos',
  description: 'humkio: sistema de inventario basado en proyectos para organizar y gestionar objetos',
  generator: 'v0.app',
  icons: {
    icon: '/humkio.png',
    apple: '/humkio.png',
  },
  openGraph: {
    title: 'humkio',
    description: 'Sistema de inventario basado en proyectos',
    url: '/',
    siteName: 'humkio',
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'humkio',
    description: 'Sistema de inventario basado en proyectos',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ProjectProvider>
            <AchievementsProvider>
              {children}
              <Toaster />
            </AchievementsProvider>
          </ProjectProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
