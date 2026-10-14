import { Button, Chip, Separator, Stack, Text } from '@omniviewdev/base-ui';
import type { Node } from 'kubernetes-types/core/v1';
import React from 'react';

import { convertKubernetesByteUnits } from '../../../../utils/convert';
import { roundedChipStyle, sectionBorderStyle } from '../shared/sectionStyles';

const headerStyle: React.CSSProperties = {
  padding: '4px 8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
  userSelect: 'none',
};
const imageListStyle: React.CSSProperties = {
  padding: '4px 8px',
  maxHeight: 300,
  overflow: 'auto',
};
const imageRowStyle: React.CSSProperties = { paddingBlock: 2, minHeight: 20 };
const imageNameStyle: React.CSSProperties = { flex: 1, minWidth: 0, marginRight: 8 };
const imageSizeTextStyle: React.CSSProperties = { flexShrink: 0 };
const showAllStyle: React.CSSProperties = { paddingInline: 0, marginBlock: 2 };

interface Props {
  node: Node;
}

const NodeImagesSection: React.FC<Props> = ({ node }) => {
  const images = node.status?.images;
  const [expanded, setExpanded] = React.useState(false);

  if (!images || images.length === 0) return null;

  const totalSize = images.reduce((sum, img) => sum + (img.sizeBytes ?? 0), 0);
  const displayed = expanded ? images : images.slice(0, 5);

  return (
    <div style={sectionBorderStyle}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        style={headerStyle}
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
      >
        <Stack direction="row" spacing={0} align="center" style={{ gap: 6 }}>
          <Text weight="semibold" size="sm">
            Images
          </Text>
          <Chip size="xs" variant="soft" style={roundedChipStyle}>
            {`${images.length}`}
          </Chip>
        </Stack>
        <Chip size="xs" variant="soft" style={roundedChipStyle}>
          {convertKubernetesByteUnits({ from: `${totalSize}B`, to: 'GB' })}
        </Chip>
      </div>
      <Separator />
      <div style={imageListStyle}>
        {displayed.map((image, idx) => {
          // Use the shortest name as display name (usually the tag-less sha is longest).
          const displayName = image.names
            ? [...image.names].sort((a, b) => a.length - b.length)[0]
            : `image-${idx}`;
          const sizeStr = image.sizeBytes
            ? convertKubernetesByteUnits({ from: `${image.sizeBytes}B`, to: 'MB' })
            : '';

          return (
            <Stack
              key={displayName}
              direction="row"
              spacing={0}
              justify="between"
              align="center"
              style={imageRowStyle}
            >
              <Text size="xs" truncate style={imageNameStyle}>
                {displayName}
              </Text>
              {sizeStr && (
                <Text size="xs" tone="subtle" style={imageSizeTextStyle}>
                  {sizeStr}
                </Text>
              )}
            </Stack>
          );
        })}
        {!expanded && images.length > 5 && (
          <Button
            variant="ghost"
            color="brand"
            size="xs"
            style={showAllStyle}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setExpanded(true);
            }}
          >
            Show all {images.length} images...
          </Button>
        )}
      </div>
    </div>
  );
};

export default NodeImagesSection;
