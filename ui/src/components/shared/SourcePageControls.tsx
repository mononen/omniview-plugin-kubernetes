import { Button, Stack, Text } from '@omniviewdev/base-ui';
import type { SourcePageNavigation } from '../../hooks/useSourcePageNavigation';

export interface SourcePageControlsProps {
  pagination: SourcePageNavigation;
  nextCursor?: string;
  loading?: boolean;
  label?: string;
  refresh?: () => void;
  membershipStale?: boolean;
  error?: unknown;
  retry?: () => void;
  compact?: boolean;
}

function pageErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'number' || typeof error === 'bigint' || typeof error === 'boolean') return String(error);
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Unable to acquire this source page';
}

/** Source navigation never treats page length as a total or drains continuation. */
export function SourcePageControls({ pagination, nextCursor, loading, refresh, membershipStale, error, retry, compact = false, label = 'Resources' }: SourcePageControlsProps) {
  return (
    <Stack direction="row" spacing={1} align="center" role="group" aria-label={`${label} source pages; total unknown; filters apply only to the selected page`}
      style={{ flexWrap: 'wrap', minWidth: 0, gap: 4, overflowWrap: 'anywhere' }}>
      <Text size="xs" tone="muted" title={`${label}: total unknown; filters apply only to this page`}
        style={compact ? { width: '100%' } : undefined}>
        {compact ? `${label} · page ${pagination.pageNumber}` : `${label}: page ${pagination.pageNumber} · total unknown · filters apply to this page`}
      </Text>
      <Button size="sm" variant="outline" aria-label={`${label}: first page`} title="First page" disabled={pagination.isFirstRequest} onClick={pagination.firstPage}>{compact ? '«' : 'First'}</Button>
      <Button size="sm" variant="outline" aria-label={`${label}: previous page`} title="Previous page" disabled={!pagination.canPrevious} onClick={pagination.previousPage}>{compact ? '‹' : 'Previous'}</Button>
      <Button size="sm" variant="outline" aria-label={`${label}: next page`} title="Next page" disabled={loading || !!error || nextCursor === undefined} onClick={() => pagination.nextPage(nextCursor)}>{compact ? '›' : 'Next'}</Button>
      {refresh && <Button size="sm" variant="outline" aria-label={`${label}: refresh acquired page`} title="Refresh acquired page" disabled={loading} onClick={refresh}>{compact ? '↻' : 'Refresh page'}</Button>}
      {!!error && <Text role="alert" size="xs">Page request failed: {pageErrorMessage(error)}</Text>}
      {!!error && retry && <Button size="sm" variant="outline" disabled={loading} onClick={retry}>Retry page</Button>}
      {membershipStale && <Text role="status" size="xs">Page membership may have changed. Refresh this page.</Text>}
    </Stack>
  );
}
