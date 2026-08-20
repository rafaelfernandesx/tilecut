import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (() => {
      const repo = process.env.GITHUB_REPOSITORY
      if (!repo) return ''
      return `https://${repo.split('/')[0]}.github.io/${repo.split('/')[1]}/`
    })()
  if (!siteUrl) return []
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}