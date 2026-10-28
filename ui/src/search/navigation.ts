import type { NavMenuItem, NavSection } from '../types/navigation';

export type SearchDestination = {
  id: string;
  label: string;
  category: string;
  disabled: boolean;
  resourceKey?: string;
};

/** Use the sidebar's destinations, including navigable parents, without group-only rows. */
export function searchDestinations(sections: readonly NavSection[]): SearchDestination[] {
  const result: SearchDestination[] = [];
  function walk(items: readonly NavMenuItem[], category: string, parentDisabled = false) {
    for (const item of items) {
      const disabled = parentDisabled || Boolean(item.disabled);
      const children = item.children ?? [];
      if (!children.length || ('selectable' in item && item.selectable === true)) {
        result.push({
          id: item.id,
          label: item.label,
          category,
          disabled,
        });
      }
      if (children.length) walk(children, item.label, disabled);
    }
  }
  for (const section of sections) walk(section.items, section.title || 'General');
  return result;
}

export function destinationPath(connectionID: string, id: string, search?: string): string {
  const root = `/cluster/${encodeURIComponent(connectionID)}/resources`;
  const suffix = id === '__dashboard__' ? '' : id.startsWith('page/')
    ? `/${id.split('/').map(encodeURIComponent).join('/')}` : `/${encodeURIComponent(decodeURIComponent(id))}`;
  return `${root}${suffix}${search === undefined ? '' : `?${new URLSearchParams({ search })}`}`;
}

/** Rank exact names and prefixes before subsequence/category matches. */
export function destinationScore(query: string, label: string, description = ''): number {
  const needle = query.trim().toLowerCase();
  if (!needle) return 1;
  const name = label.toLowerCase();
  if (name === needle) return 100;
  if (name.startsWith(needle)) return 80 + 10 / (name.length - needle.length + 1);
  if (name.includes(needle)) return 60;
  if (description.toLowerCase().includes(needle)) return 30;
  let offset = 0;
  for (const character of name) if (character === needle[offset]) offset++;
  return offset === needle.length ? 10 : 0;
}

export function prependRecent(current: readonly string[], id: string): string[] {
  return [id, ...current.filter((entry) => entry !== id)].slice(0, 8);
}
