# rohandisa.github.io

Static Astro 5 portfolio for Rohan Disa. Built from `SPEC.md` and deployed to GitHub Pages at [rohandisa.github.io](https://rohandisa.github.io/).

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Start the local dev server |
| `npm run build` | Build the production site to `./dist/` |
| `npm run preview` | Preview the production build |
| `npm test` | Run Raft simulator unit tests |

## Add a project

Adding a project is one MDX file. Nothing else has to change.

1. Create `src/content/projects/<slug>.mdx`.
2. Fill the frontmatter from the schema in `src/content.config.ts`: `title`, `tagline`, `lane` (`agents` | `systems` | `ml`), `period`, `order`, `featured`, `stack`, `metrics` (up to four `{ value, label }`), and `links`.
3. Write the case-study body in Markdown. Headings start at `##` because the page already has an `h1`.
4. Optional: set `interactive: 'raft-sim'` and drop `<RaftSimBlock />` in the body, or `interactive: 'trace-replay'` and use `<TraceLine />` for labeled illustrative traces.
5. Set `draft: true` to hide the project in production builds.

The home page featured grid, `/work` filters, command palette, sitemap, and Open Graph image (`/og/<slug>.png`) all pick the file up from the content collection.

## Deploy

The site is static. There is no server and no runtime network.

1. In the GitHub repo, set Settings > Pages > Source to GitHub Actions.
2. Push to `main`, or run the workflow by hand. `.github/workflows/deploy.yml` builds with `withastro/action` and publishes with `actions/deploy-pages`.
3. The first deploy takes about one to two minutes. `astro.config.mjs` sets `site: 'https://rohandisa.github.io'` so canonical URLs and the sitemap stay correct.

## Content sources

Site-wide copy lives in `src/data/site.ts`. Experience and open-source entries live in `src/content/experience.yaml` and `src/content/oss.yaml`. Do not hardcode project text in components.
