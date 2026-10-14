import { IconButton } from '@omniviewdev/base-ui';
import React from 'react';
import { LuStar } from 'react-icons/lu';

const buttonStyle: React.CSSProperties = { minWidth: 24, minHeight: 24 };

type Props = {
  isFavorite: boolean;
  onToggle: () => void;
};

const FavoriteButton: React.FC<Props> = ({ isFavorite, onToggle }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <IconButton
      size="sm"
      variant="ghost"
      color={isFavorite ? 'warning' : 'neutral'}
      onClick={handleClick}
      style={buttonStyle}
      aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
      aria-pressed={isFavorite}
    >
      <LuStar size={14} fill={isFavorite ? 'currentColor' : 'none'} />
    </IconButton>
  );
};

export default FavoriteButton;
