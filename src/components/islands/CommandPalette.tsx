import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { copyEmail } from '../../lib/copyEmail';
import type { CommandGroup, PaletteCommand } from '../../lib/commandTypes';
import { fuzzyScore } from '../../lib/fuzzy';
import { Toast, useTimedToast } from './toast';

const GROUPS: CommandGroup[] = ['navigate', 'actions', 'filters'];
const GROUP_LABEL: Record<CommandGroup, string> = {
  navigate: 'Navigate',
  actions: 'Actions',
  filters: 'Filters',
};

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

function rankCommands(commands: PaletteCommand[], query: string): PaletteCommand[] {
  const q = query.trim();
  const scored = q
    ? commands
        .map((command) => ({
          command,
          score: fuzzyScore(q, `${command.label} ${command.group} ${command.keywords ?? ''}`),
        }))
        .filter((row) => row.score > 0)
    : commands.map((command) => ({ command, score: 1 }));

  const ranked: PaletteCommand[] = [];
  for (const group of GROUPS) {
    ranked.push(
      ...scored
        .filter((row) => row.command.group === group)
        .sort((a, b) =>
          q ? b.score - a.score || a.command.label.length - b.command.label.length : 0,
        )
        .map((row) => row.command),
    );
  }
  return ranked;
}

function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

function runCommand(command: PaletteCommand): string | null {
  if (command.action === 'copy-email') {
    void copyEmail(command.payload ?? '');
    return 'Email copied';
  }
  if (command.action === 'toggle-theme') {
    toggleTheme();
    return null;
  }
  if (!command.href) return null;
  if (/^https?:\/\//.test(command.href)) {
    window.open(command.href, '_blank', 'noopener,noreferrer');
    return null;
  }
  window.location.assign(command.href);
  return null;
}

export default function CommandPalette({ commands }: { commands: PaletteCommand[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [toast, setToast] = useTimedToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const results = useMemo(() => rankCommands(commands, query), [commands, query]);
  const active = results[selected];

  const close = () => {
    setOpen(false);
    setQuery('');
    const restore = restoreRef.current;
    restoreRef.current = null;
    requestAnimationFrame(() => restore?.focus());
  };

  const openPalette = () => {
    const activeEl = document.activeElement;
    restoreRef.current = activeEl instanceof HTMLElement ? activeEl : null;
    setQuery('');
    setSelected(0);
    setOpen(true);
  };

  const run = (command: PaletteCommand) => {
    const message = runCommand(command);
    close();
    if (message) setToast(message);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) close();
        else openPalette();
        return;
      }

      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isTextField(event.target)) return;
        event.preventDefault();
        if (!open) openPalette();
        return;
      }

      if (!open) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelected((index) => (results.length === 0 ? 0 : (index + 1) % results.length));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelected((index) =>
          results.length === 0 ? 0 : (index - 1 + results.length) % results.length,
        );
        return;
      }

      if (event.key === 'Enter') {
        if (event.target instanceof HTMLButtonElement) return;
        event.preventDefault();
        if (active) run(active);
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        const root = dialogRef.current;
        if (!root) return;
        const focusable = [
          ...root.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ].filter((el) => !el.hasAttribute('disabled'));
        if (focusable.length === 0) return;
        const current = document.activeElement;
        const pos = focusable.findIndex((el) => el === current);
        const next = event.shiftKey
          ? (pos <= 0 ? focusable.length : pos) - 1
          : (pos + 1) % focusable.length;
        focusable[next]?.focus();
      }
    };

    const onTriggerClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('#command-palette-trigger')) return;
      event.preventDefault();
      openPalette();
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onTriggerClick);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onTriggerClick);
    };
  }, [active, open, results]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const trigger = document.getElementById('command-palette-trigger');
    trigger?.setAttribute('aria-expanded', 'true');
    return () => {
      document.body.style.overflow = previous;
      trigger?.setAttribute('aria-expanded', 'false');
    };
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    if (!open || !active) return;
    document.getElementById(`cmd-${active.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, selected]);

  return (
    <div>
      {open && (
        <div class="fixed inset-0 z-60 flex items-start justify-center px-4 pt-[12vh]">
          <div
            class="bg-bg/70 absolute inset-0"
            onMouseDown={close}
          ></div>
          <div
            ref={dialogRef}
            id="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            class="border-border bg-surface relative w-full max-w-xl overflow-hidden rounded-lg border shadow-lg"
          >
            <label class="border-border flex items-center gap-2 border-b px-3 py-2.5 font-mono text-sm">
              <span class="text-accent" aria-hidden="true">
                &gt;
              </span>
              <input
                ref={inputRef}
                value={query}
                onInput={(event) => setQuery(event.currentTarget.value)}
                class="text-text placeholder:text-muted min-w-0 flex-1 bg-transparent"
                placeholder="search commands"
                aria-autocomplete="list"
                aria-controls="command-palette-list"
                aria-activedescendant={active ? `cmd-${active.id}` : undefined}
              />
            </label>
            <div
              id="command-palette-list"
              role="listbox"
              aria-label="Commands"
              class="max-h-80 overflow-y-auto p-2"
            >
              {results.length === 0 && <p class="text-muted px-2 py-3 font-mono text-xs">No matches</p>}
              {results.map((command, index) => {
                const showGroup = index === 0 || results[index - 1].group !== command.group;
                return (
                  <div key={command.id}>
                    {showGroup && (
                      <p class="text-muted px-2 pt-2 pb-1 font-mono text-[0.7rem] tracking-eyebrow uppercase">
                        {GROUP_LABEL[command.group]}
                      </p>
                    )}
                    <button
                      type="button"
                      role="option"
                      id={`cmd-${command.id}`}
                      aria-selected={index === selected}
                      class={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left font-mono text-sm ${
                        index === selected ? 'bg-surface-2 text-text' : 'text-muted'
                      }`}
                      onMouseEnter={() => setSelected(index)}
                      onClick={() => run(command)}
                    >
                      <span class="min-w-0 truncate">{command.label}</span>
                      <span class="text-muted shrink-0 text-xs">{command.hint}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast} />}
    </div>
  );
}
