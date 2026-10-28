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
}

/** Source navigation never treats page length as a total or drains continuation. */
export function SourcePageControls({ pagination, nextCursor, loading, refresh, membershipStale, error, retry, label = 'Resources' }: SourcePageControlsProps) {
  return (
    <Stack direction="row" spacing={1} align="center" role="group" aria-label={`${label} source pages`}>
      <Button size="sm" variant="outline" disabled={pagination.isFirstRequest} onClick={pagination.firstPage}>First</Button>
      <Button size="sm" variant="outline" disabled={!pagination.canPrevious} onClick={pagination.previousPage}>Previous</Button>
      <Text size="xs" tone="muted">{label}: page {pagination.pageNumber} · total unknown · filters apply to this page</Text>
      <Button size="sm" variant="outline" disabled={loading || !!error || nextCursor === undefined} onClick={() => pagination.nextPage(nextCursor)}>Next</Button>
      {refresh && <Button size="sm" variant="outline" disabled={loading} onClick={refresh}>Refresh page</Button>}
      {!!error && <Text role="alert" size="xs">Page request failed: {error instanceof Error ? error.message : String(error)}</Text>}
      {!!error && retry && <Button size="sm" variant="outline" disabled={loading} onClick={retry}>Retry page</Button>}
      {membershipStale && <Text role="status" size="xs">Page membership may have changed. Refresh this page.</Text>}
    </Stack>
  );
}
