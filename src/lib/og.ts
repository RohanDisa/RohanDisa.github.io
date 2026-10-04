import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { site } from '../data/site';

export interface OgChip {
  value: string;
  label: string;
}

export interface OgPage {
  slug: string;
  title: string;
  chip: OgChip;
}

async function fonts() {
  const root = process.cwd();
  const mono = await readFile(join(root, 'src/assets/fonts/IBMPlexMono-Regular.ttf'));
  return [{ name: 'IBM Plex Mono', data: mono, weight: 400 as const, style: 'normal' as const }];
}

function wordRow(text: string, style: Record<string, string | number>) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        ...style,
      },
      children: text.split(/\s+/).filter(Boolean).map((word) => ({
        type: 'div',
        props: {
          style: { display: 'flex', marginRight: 14 },
          children: word,
        },
      })),
    },
  };
}

export async function renderOgPng(title: string, chip: OgChip): Promise<Uint8Array> {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#0A0C10',
          color: '#E7E9EE',
          padding: '56px 64px',
          border: '1px solid #232833',
        },
        children: [
          wordRow('run: og_image · model: rohan-v1 · status: done', {
            fontFamily: 'IBM Plex Mono',
            fontSize: 20,
            color: '#8B93A1',
          }),
          wordRow(site.name, {
            marginTop: 48,
            fontFamily: 'IBM Plex Mono',
            fontSize: 22,
            color: '#7CF2B4',
          }),
          wordRow(title, {
            marginTop: 16,
            fontFamily: 'IBM Plex Mono',
            fontSize: 44,
            lineHeight: 1.2,
            maxWidth: 1040,
          }),
          wordRow(`${chip.value} ${chip.label}`, {
            marginTop: 'auto',
            border: '1px solid #232833',
            backgroundColor: '#11141A',
            borderRadius: 8,
            padding: '12px 18px',
            fontFamily: 'IBM Plex Mono',
            fontSize: 22,
            color: '#E7E9EE',
          }),
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: await fonts(),
    },
  );

  return new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  })
    .render()
    .asPng();
}
