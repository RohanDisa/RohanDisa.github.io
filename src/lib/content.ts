import { getCollection, type CollectionEntry } from 'astro:content';

export type Project = CollectionEntry<'projects'>;
export type Experience = CollectionEntry<'experience'>;

export async function getProjects(): Promise<Project[]> {
  const projects = await getCollection('projects', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );

  return projects.sort((a, b) => {
    if (a.data.order !== b.data.order) return a.data.order - b.data.order;
    return a.data.period.localeCompare(b.data.period);
  });
}

export function projectHref(project: Project): string {
  return `/work/${project.id}`;
}

export function missingRepoLabel(project: Project): string | null {
  if (project.data.links.github) return null;
  if (project.data.interactive === 'trace-replay') return 'Internal project';
  return 'Private repo, code walkthrough on request';
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function formatYearMonth(value: string): string {
  if (value === 'present') return 'present';
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  return `${MONTHS[month - 1]} ${year}`;
}

export function monthIndex(value: string): number {
  const [year, month] = value.split('-').map(Number);
  return year * 12 + (month - 1);
}

const AXIS_START = monthIndex('2024-07');
const AXIS_END = monthIndex('2026-10');
const AXIS_SPAN = AXIS_END - AXIS_START + 1;

export function spanRange(start: string, end: string): { start: number; end: number } {
  const startIdx = Math.max(0, monthIndex(start) - AXIS_START);
  const rawEnd = end === 'present' ? AXIS_END : monthIndex(end);
  const endIdx = Math.min(AXIS_SPAN, rawEnd - AXIS_START + 1);
  return {
    start: (startIdx / AXIS_SPAN) * 100,
    end: (endIdx / AXIS_SPAN) * 100,
  };
}
