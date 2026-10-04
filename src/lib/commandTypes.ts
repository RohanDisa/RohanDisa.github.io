export type CommandGroup = 'navigate' | 'actions' | 'filters';

export interface PaletteCommand {
  id: string;
  group: CommandGroup;
  label: string;
  hint: string;
  href?: string;
  action?: 'copy-email' | 'toggle-theme';
  payload?: string;
  keywords?: string;
}
