import { CommandPalette } from '@omniviewdev/editors';

import { useResourceCommandPalette } from '../../hooks/useResourceCommandPalette';
import type { NavSection } from '../../types/navigation';

interface ResourceCommandPaletteProps {
  connectionID: string;
  layout: NavSection[];
  onNavigate: (resourceID: string) => void;
}

export default function ResourceCommandPalette({
  connectionID,
  layout,
  onNavigate,
}: ResourceCommandPaletteProps) {
  const { open, handleClose, handleSelect, commands } = useResourceCommandPalette({
    connectionID,
    layout,
    onSelect: onNavigate,
  });

  return (
    <CommandPalette
      open={open}
      onClose={handleClose}
      commands={commands}
      onSelect={handleSelect}
      placeholder="Go to resource type..."
    />
  );
}
