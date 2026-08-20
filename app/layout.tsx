import type { Metadata } from 'next'
import './globals.css'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (() => {
    const repo = process.env.GITHUB_REPOSITORY
    if (!repo) return ''
    return `https://${repo.split('/')[0]}.github.io/${repo.split('/')[1]}/`
  })()

export const metadata: Metadata = {
  title: {
    default: 'Tilecut — Recorte spritesheets em tiles, editor online grátis',
    template: '%s | Tilecut',
  },
  description:
    'Recorte spritesheets em tiles gratuitamente e direto no navegador. Importe uma ou várias imagens (PNG, JPG ou WEBP), defina o tamanho do tile (8x8, 16x16, 32x32, 48x48, 64x64), selecione os tiles e exporte sprites PNG sem perda de qualidade e com transparência preservada — cada um separadamente ou todos em um arquivo ZIP. Processamento 100% local, seus arquivos nunca saem do seu computador.',
  keywords: [
    'recortar spritesheet',
    'sprite sheet cutter',
    'tile editor',
    'recortar sprites',
    'tilesheet',
    'editor de sprites online',
    'cortar pixel art',
    'gerar png de spritesheet',
    'recorte de tiles',
    'sprite slicing',
  ],
  authors: [{ name: 'Tilecut' }],
  creator: 'Tilecut',
  applicationName: 'Tilecut | Sprite Cutter',
  category: 'Ferramentas de desenvolvimento de jogos',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  ...(siteUrl ? { alternates: { canonical: siteUrl } } : {}),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Tilecut | Sprite Cutter',
    title: 'Tilecut — Recorte spritesheets em tiles, editor online grátis',
    description:
      'Editor de recorte de spritesheets por tiles no navegador: importe uma imagem, selecione os tiles na grade e exporte PNGs perfeitos com precisão de pixel — individualmente ou todos em um arquivo ZIP. Sem servidores, sem envio de arquivos.',
    ...(siteUrl ? { url: siteUrl } : {}),
  },
  twitter: {
    card: 'summary',
    title: 'Tilecut — Recorte spritesheets em tiles',
    description: 'Recorte spritesheets em tiles com precisão de pixels e exporte PNGs sem perda e com transparência.',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Tilecut | Sprite Cutter',
    description:
      'Editor online para recortar spritesheets em tiles. Importe PNG, JPG ou WEBP, defina o tamanho do tile, selecione as áreas e exporte sprites PNG sem perda, com transparência preservada — cada um separado ou todos em um arquivo ZIP, tudo no navegador.',
    applicationCategory: 'GraphicsApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript and an HTML5 Canvas capable browser',
    url: siteUrl || 'https://github.com/',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
    ...(siteUrl ? { sameAs: [siteUrl] } : {}),
  }
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  )
}