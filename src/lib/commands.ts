import { site } from '../data/site';
import type { PaletteCommand } from './commandTypes';
import { getProjects, projectHref } from './content';

export type { CommandGroup, PaletteCommand } from './commandTypes';

const RESUME_PDF = '/Rohan_Disa_Resume.pdf';

export async function buildCommands(): Promise<PaletteCommand[]> {
  const projects = await getProjects();

  const navigate: PaletteCommand[] = [
    { id: 'nav-home', group: 'navigate', label: 'Home', hint: '↵ open', href: '/' },
    { id: 'nav-work', group: 'navigate', label: 'Work', hint: '↵ open', href: '/work' },
    ...projects.map((project) => ({
      id: `nav-project-${project.id}`,
      group: 'navigate' as const,
      label: project.data.title,
      hint: '↵ open',
      href: projectHref(project),
      keywords: project.data.lane,
    })),
    {
      id: 'nav-experience',
      group: 'navigate',
      label: 'Experience',
      hint: '↵ open',
      href: '/#experience',
    },
    { id: 'nav-resume', group: 'navigate', label: 'Resume', hint: '↵ open', href: '/resume' },
    { id: 'nav-contact', group: 'navigate', label: 'Contact', hint: '↵ open', href: '/#contact' },
  ];

  const actions: PaletteCommand[] = [
    {
      id: 'act-copy-email',
      group: 'actions',
      label: 'Copy email',
      hint: '⌘C copy',
      action: 'copy-email',
      payload: site.email,
      keywords: site.email,
    },
    {
      id: 'act-download-resume',
      group: 'actions',
      label: 'Download resume',
      hint: '↵ open',
      href: RESUME_PDF,
    },
    {
      id: 'act-toggle-theme',
      group: 'actions',
      label: 'Toggle theme',
      hint: '↵ run',
      action: 'toggle-theme',
      keywords: 'dark light mode',
    },
    {
      id: 'act-github',
      group: 'actions',
      label: 'Open GitHub',
      hint: '↵ open',
      href: site.github,
    },
  ];

  if (site.linkedin) {
    actions.push({
      id: 'act-linkedin',
      group: 'actions',
      label: 'Open LinkedIn',
      hint: '↵ open',
      href: site.linkedin,
    });
  }

  const filters: PaletteCommand[] = (Object.keys(site.lanes) as Array<keyof typeof site.lanes>).map(
    (lane) => ({
      id: `filter-${lane}`,
      group: 'filters' as const,
      label: `show ${lane} projects`,
      hint: '↵ open',
      href: `/work?lane=${lane}`,
      keywords: site.lanes[lane].title,
    }),
  );

  return [...navigate, ...actions, ...filters];
}
