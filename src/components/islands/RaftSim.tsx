import { useEffect, useRef, useState } from 'preact/hooks';
import {
  RaftEngine,
  type EventKind,
  type MessageView,
  type NodeView,
  type SimEvent,
} from '../../lib/raft-sim';

const BADGE: Record<EventKind, string> = {
  plan: 'text-muted border-border',
  tool_call: 'text-accent-2 border-accent-2',
  observe: 'text-warn border-warn',
  result: 'text-accent border-accent',
};

const CX = 130;
const CY = 118;
const R = 78;
const VB = '0 0 260 240';

function reduced(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function xy(i: number, n: number): [number, number] {
  const a = (Math.PI * 2 * i) / n - Math.PI / 2;
  return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
}

function termFill(term: number): string {
  return ['var(--accent)', 'var(--accent-2)', 'var(--warn)', 'var(--muted)'][term % 4];
}

function Cluster({
  nodes,
  messages,
  compact,
}: {
  nodes: NodeView[];
  messages: MessageView[];
  compact?: boolean;
}) {
  const n = nodes.length;
  return (
    <svg
      viewBox={VB}
      class="h-auto w-full"
      role="img"
      aria-label={`Raft cluster with ${n} nodes`}
    >
      {nodes.map((a, i) =>
        nodes.map((b, j) =>
          j > i ? (
            <line
              key={`${a.id}-${b.id}`}
              x1={xy(i, n)[0]}
              y1={xy(i, n)[1]}
              x2={xy(j, n)[0]}
              y2={xy(j, n)[1]}
              stroke="var(--border)"
              stroke-dasharray={a.side !== b.side ? '3 3' : undefined}
            />
          ) : null,
        ),
      )}
      {messages.map((m) => {
        const [x1, y1] = xy(m.from, n);
        const [x2, y2] = xy(m.to, n);
        return (
          <circle
            key={m.id}
            cx={x1 + (x2 - x1) * m.progress}
            cy={y1 + (y2 - y1) * m.progress}
            r={compact ? 2.5 : 3}
            fill={m.kind === 'rv' ? 'var(--warn)' : 'var(--accent-2)'}
          />
        );
      })}
      {nodes.map((node, i) => {
        const [x, y] = xy(i, n);
        const fill = node.alive ? 'var(--surface)' : 'var(--surface-2)';
        const stroke =
          node.alive && node.role === 'leader'
            ? 'var(--warn)'
            : node.alive
              ? 'var(--border)'
              : 'var(--muted)';
        return (
          <g key={node.id} opacity={node.alive ? 1 : 0.45}>
            {node.alive && node.role === 'leader' && (
              <circle cx={x} cy={y} r={28} fill="none" stroke="var(--warn)" stroke-width="2" />
            )}
            <circle cx={x} cy={y} r={22} fill={fill} stroke={stroke} stroke-width="1.5" />
            <text
              x={x}
              y={y - 6}
              text-anchor="middle"
              fill="var(--text)"
              font-size="9"
              font-family="var(--font-mono)"
            >
              n{node.id}
            </text>
            <text
              x={x}
              y={y + 5}
              text-anchor="middle"
              fill="var(--muted)"
              font-size="7"
              font-family="var(--font-mono)"
            >
              {node.role} t={node.term}
            </text>
            {node.log.slice(-5).map((entry, k) => (
              <rect
                key={`${node.id}-${k}`}
                x={x - 16 + k * 7}
                y={y + 10}
                width="6"
                height="7"
                rx="1"
                fill={entry.committed ? termFill(entry.term) : 'none'}
                stroke={termFill(entry.term)}
                opacity={entry.applied ? 1 : 0.55}
              />
            ))}
            {!node.alive && (
              <path
                d={`M${x - 8} ${y - 8} L${x + 8} ${y + 8} M${x + 8} ${y - 8} L${x - 8} ${y + 8}`}
                stroke="var(--danger)"
                stroke-width="2"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Trace({ events }: { events: SimEvent[] }) {
  return (
    <ol class="max-h-64 space-y-0 overflow-y-auto font-mono text-xs">
      {events
        .slice(-14)
        .reverse()
        .map((event, i) => (
          <li key={`${event.t}-${i}`} class="grid grid-cols-[auto_auto_minmax(0,1fr)] items-baseline gap-x-2 py-1">
            <span class="text-muted tabular-nums">t={event.t}</span>
            <span class={`inline-flex rounded border px-1 py-0.5 ${BADGE[event.type]}`}>{event.type}</span>
            <span class="text-text min-w-0 wrap-break-word">{event.text}</span>
          </li>
        ))}
    </ol>
  );
}

export default function RaftSim({ teaser = false }: { teaser?: boolean }) {
  const engine = useRef<RaftEngine | null>(null);
  if (!engine.current) engine.current = new RaftEngine({ seed: teaser ? 1 : 7, nodeCount: 3 });
  const putN = useRef(0);
  const pausedRef = useRef(reduced());
  const speedRef = useRef(1);
  const [snap, setSnap] = useState(() => engine.current!.snapshot());
  const [events, setEvents] = useState<SimEvent[]>(() => engine.current!.events());
  const [paused, setPaused] = useState(pausedRef.current);
  const [speed, setSpeed] = useState(1);
  const [nodes, setNodes] = useState<3 | 5>(3);
  const [part, setPart] = useState(false);

  const flush = () => {
    setSnap(engine.current!.snapshot());
    setEvents(engine.current!.events());
  };

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      if (!pausedRef.current) {
        engine.current!.step(dt * speedRef.current);
        flush();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const act = (fn: () => void) => {
    fn();
    flush();
  };

  return (
    <figure class="border-border bg-surface overflow-hidden rounded-lg border">
      <div class={teaser ? '' : 'grid gap-3 p-3 md:grid-cols-12'}>
        <div class={teaser ? 'p-2' : 'md:col-span-8'}>
          <Cluster nodes={snap.nodes} messages={snap.messages} compact={teaser} />
          {!teaser && (
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="border-border text-text rounded-md border px-2 py-1 font-mono text-xs"
                onClick={() =>
                  act(() => {
                    const next = putN.current + 1;
                    if (engine.current!.put('k', String(next)) === 'KV_PENDING') putN.current = next;
                  })
                }
              >
                Client Put
              </button>
              <button
                type="button"
                class="border-border text-text rounded-md border px-2 py-1 font-mono text-xs"
                onClick={() => act(() => engine.current!.get('x'))}
              >
                Client Get
              </button>
              <button
                type="button"
                class="border-border text-text rounded-md border px-2 py-1 font-mono text-xs"
                onClick={() => act(() => engine.current!.killLeader())}
              >
                Kill leader
              </button>
              <button
                type="button"
                class="border-border text-text rounded-md border px-2 py-1 font-mono text-xs"
                onClick={() => act(() => engine.current!.restoreNode())}
              >
                Restore
              </button>
              <button
                type="button"
                class="border-border text-text rounded-md border px-2 py-1 font-mono text-xs"
                aria-pressed={part}
                onClick={() =>
                  act(() => {
                    const next = !part;
                    setPart(next);
                    engine.current!.setPartitioned(next);
                  })
                }
              >
                Partition
              </button>
              <button
                type="button"
                class="border-border text-text rounded-md border px-2 py-1 font-mono text-xs"
                onClick={() =>
                  act(() => {
                    const next = nodes === 3 ? 5 : 3;
                    setNodes(next);
                    setPart(false);
                    putN.current = 0;
                    engine.current!.setNodeCount(next);
                  })
                }
              >
                {nodes} nodes
              </button>
              <label class="text-muted flex items-center gap-1 font-mono text-xs">
                speed
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.5"
                  value={speed}
                  onInput={(event) => setSpeed(Number(event.currentTarget.value))}
                  class="accent-accent w-20"
                />
              </label>
              <button
                type="button"
                class="border-border text-text rounded-md border px-2 py-1 font-mono text-xs"
                aria-pressed={paused}
                onClick={() => setPaused((value) => !value)}
              >
                {paused ? 'Play' : 'Pause'}
              </button>
            </div>
          )}
        </div>
        {!teaser && (
          <div class="border-border md:col-span-4 md:border-l md:pl-3">
            <p class="text-muted mb-1 font-mono text-[0.7rem] tracking-eyebrow uppercase">Event log</p>
            <Trace events={events} />
          </div>
        )}
      </div>
      <figcaption class="text-muted border-border border-t px-3 py-2 font-mono text-[0.7rem]">
        Teaching visualization of Raft, not the production code.
      </figcaption>
    </figure>
  );
}
