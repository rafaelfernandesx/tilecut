import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Tilecut | Sprite Cutter', description: 'Recorte spritesheet com precisão de pixels.' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>
}
