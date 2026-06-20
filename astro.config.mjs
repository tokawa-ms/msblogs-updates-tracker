import { defineConfig } from 'astro/config';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'msblogs-updates-tracker';
const site = process.env.SITE_URL ?? `https://tokawa-ms.github.io/${repositoryName}`;
const base = process.env.BASE_PATH ?? `/${repositoryName}`;

export default defineConfig({
  output: 'static',
  site,
  ...(process.env.GITHUB_ACTIONS === 'true' ? { base } : {}),
});
