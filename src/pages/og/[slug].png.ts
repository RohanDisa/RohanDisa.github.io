import type { APIRoute } from 'astro';
import { site } from '../../data/site';
import { getProjects } from '../../lib/content';
import { renderOgPng, type OgPage } from '../../lib/og';

export async function getStaticPaths() {
  const projects = await getProjects();
  const pages: OgPage[] = [
    {
      slug: 'home',
      title: site.pitch,
      chip: { value: '80%', label: 'less manual analysis' },
    },
    {
      slug: 'work',
      title: 'All projects',
      chip: { value: String(projects.length), label: 'projects' },
    },
    {
      slug: 'resume',
      title: 'Resume',
      chip: { value: 'PDF', label: 'download' },
    },
    ...projects.map((project) => ({
      slug: project.id,
      title: project.data.title,
      chip: project.data.metrics[0] ?? { value: project.data.lane, label: 'lane' },
    })),
  ];

  return pages.map((page) => ({
    params: { slug: page.slug },
    props: page,
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const page = props as OgPage;
  const png = await renderOgPng(page.title, page.chip);
  return new Response(Buffer.from(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
