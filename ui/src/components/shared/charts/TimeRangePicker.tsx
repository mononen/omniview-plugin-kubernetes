import { Button, DateTimePicker, Popover, Stack, Text } from '@omniviewdev/base-ui';
import React, { useState } from 'react';

import { DEFAULT_TIME_RANGE_PRESETS, rangeFromDuration } from './timeRange';
import type { ChartTimeRange, TimeRangePreset } from './types';

export interface TimeRangePickerProps {
  value: ChartTimeRange;
  onChange: (range: ChartTimeRange) => void;
  presets?: TimeRangePreset[];
  /** Show a "Custom" button with absolute from/to pickers. Default true. */
  customRange?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4 };
const popupStyle: React.CSSProperties = { minWidth: 300 };

/** Row of relative presets plus an optional absolute custom range popover. */
const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  value,
  onChange,
  presets = DEFAULT_TIME_RANGE_PRESETS,
  customRange = true,
  className,
  style,
}) => {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<Date | null>(value.from);
  const [to, setTo] = useState<Date | null>(value.to);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setFrom(value.from);
      setTo(value.to);
    }
    setOpen(next);
  };

  const valid = from != null && to != null && !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from < to;

  return (
    <div className={className} style={{ ...rowStyle, ...style }}>
      {presets.map((p) => (
        <Button key={p.label} size="xs" variant="outline" color="neutral" onClick={() => onChange(rangeFromDuration(p.duration))}>
          {p.label}
        </Button>
      ))}
      {customRange && (
        <Popover.Root open={open} onOpenChange={handleOpenChange}>
          <Popover.Trigger size="xs" variant="outline" color="neutral">
            Custom
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner align="start" sideOffset={6}>
              <Popover.Popup style={popupStyle}>
                <Stack direction="column" spacing={3}>
                  <Stack direction="column" spacing={1}>
                    <Text size="xs" tone="muted">From</Text>
                    <DateTimePicker size="sm" value={from} onChange={setFrom} max={to ?? undefined} />
                  </Stack>
                  <Stack direction="column" spacing={1}>
                    <Text size="xs" tone="muted">To</Text>
                    <DateTimePicker size="sm" value={to} onChange={setTo} min={from ?? undefined} />
                  </Stack>
                  <Button
                    size="sm"
                    variant="solid"
                    color="brand"
                    disabled={!valid}
                    onClick={() => {
                      if (!valid) return;
                      onChange({ from: from, to: to });
                      setOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </Stack>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
};

TimeRangePicker.displayName = 'TimeRangePicker';

export default TimeRangePicker;
