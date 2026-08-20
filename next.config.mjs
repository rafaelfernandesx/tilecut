/** @type {import('next').NextConfig} */

const isGithubActions = process.env.GITHUB_ACTIONS === 'true'
const repositoryName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : ''

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: isGithubActions && repositoryName ? `/${repositoryName}` : '',
}

export default nextConfig