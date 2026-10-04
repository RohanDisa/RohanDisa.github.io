import { useEffect, useState } from 'preact/hooks';
import { heroTrace, heroTraceSummary, type HeroTraceStep } from '../../data/heroTrace';

const CHAR_MS = 12;
const LINE_GAP_MS = 250;
const SPINNER_MS = 400;

const badge: Record<HeroTraceStep, string> = {
  plan: 'text-muted border-border',
  tool_call: 'text-accent-2 border-accent-2',
  observe: 'text-warn border-warn',
  result: 'text-accent border-accent',
};

type Row = {
  type: HeroTraceStep;
  text: string;
  spinning: boolean;
};

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function createClock() {
  const timers: number[] = [];
  return {
    sleep(ms: number) {
      return new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, ms));
      });
    },
    clear() {
      timers.forEach((id) => window.clearTimeout(id));
    },
  };
}

function LineRow({
  type,
  text,
  spinning,
  caret,
}: {
  type: HeroTraceStep;
  text: string;
  spinning?: boolean;
  caret?: boolean;
}) {
  const workSplit = text.split('view_work()');
  return (
    <div class="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 py-1 font-mono text-xs sm:text-sm">
      <span class={`inline-flex rounded border px-1.5 py-0.5 text-xs ${badge[type]}`}>{type}</span>
      <p class="text-text min-w-0 break-words">
        {workSplit.length === 2 ? (
          <>
            {workSplit[0]}
            <a href="#selected-work" class="text-accent no-underline">
              view_work()
            </a>
            {workSplit[1]}
          </>
        ) : (
          text
        )}
        {caret && <span class="text-accent">▍</span>}
        {spinning && (
          <span
            class="border-accent ml-2 inline-block size-2.5 animate-spin rounded-full border border-t-transparent"
            aria-hidden="true"
          ></span>
        )}
      </p>
    </div>
  );
}

export default function HeroTrace() {
  const [rows, setRows] = useState<Row[]>([]);
  const [done, setDone] = useState(false);
  const [runId, setRunId] = useState(0);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const clock = createClock();

    const finish = () => {
      if (cancelled) return;
      setRows(heroTrace.map((line) => ({ ...line, spinning: false })));
      setDone(true);
      setTyping(false);
    };

    if (reducedMotion()) {
      finish();
      return;
    }

    setRows([]);
    setDone(false);
    setTyping(false);

    const play = async () => {
      for (let i = 0; i < heroTrace.length; i += 1) {
        if (cancelled) return;
        const line = heroTrace[i];
        const prev = heroTrace[i - 1];

        if (line.type === 'observe' && prev?.type === 'tool_call') {
          setRows((current) =>
            current.map((row, index) =>
              index === current.length - 1 ? { ...row, spinning: true } : row,
            ),
          );
          await clock.sleep(SPINNER_MS);
          if (cancelled) return;
          setRows((current) =>
            current.map((row, index) =>
              index === current.length - 1 ? { ...row, spinning: false } : row,
            ),
          );
        }

        setTyping(true);
        for (let n = 1; n <= line.text.length; n += 1) {
          if (cancelled) return;
          setRows((current) => {
            const next = current.slice(0, i);
            next[i] = { type: line.type, text: line.text.slice(0, n), spinning: false };
            return next;
          });
          await clock.sleep(CHAR_MS);
        }
        setTyping(false);
        if (i < heroTrace.length - 1) await clock.sleep(LINE_GAP_MS);
      }
      if (!cancelled) setDone(true);
    };

    void play();
    return () => {
      cancelled = true;
      clock.clear();
    };
  }, [runId]);

  return (
    <section class="border-border bg-surface overflow-hidden rounded-lg border" aria-label="Candidate profile trace">
      <p class="sr-only">{heroTraceSummary}</p>
      <header class="border-border bg-surface-2 flex items-center justify-between gap-2 border-b px-3 py-2 font-mono text-[0.75rem]">
        <p class="text-muted min-w-0 break-words">
          <span class="text-text">run: profile_candidate</span>
          {'  ·  '}
          model: rohan-v1
          {'  ·  '}
          status: {done ? 'done' : 'running'}
          <span
            class={`ml-2 inline-block size-2 rounded-full ${done ? 'bg-accent' : 'bg-warn'}`}
            aria-hidden="true"
          ></span>
        </p>
        <button
          type="button"
          class="text-muted hover:text-text shrink-0"
          aria-label="Replay trace"
          onClick={() => setRunId((value) => value + 1)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7"></path>
            <path d="M3 4v5h5"></path>
          </svg>
        </button>
      </header>
      <div aria-live="off" class="min-h-64 p-3">
        <div class="[html.js_&]:hidden" aria-hidden="true">
          {heroTrace.map((line) => (
            <LineRow key={`${line.type}-${line.text}`} type={line.type} text={line.text} />
          ))}
        </div>
        <div class="hidden [html.js_&]:block">
          {rows.map((row, index) => (
            <LineRow
              key={`${row.type}-${index}`}
              type={row.type}
              text={row.text}
              spinning={row.spinning}
              caret={typing && index === rows.length - 1 && !done}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
