import { Card as UiCard, Chip, Separator, Stack, Text } from '@omniviewdev/base-ui';
import React from 'react';

// project imports
import Icon from './Icon';

const outerCardStyle: React.CSSProperties = { padding: 0, gap: 0, minWidth: 0 };

const headerStackStyle: React.CSSProperties = { padding: 8 };

const iconImageStyle: React.CSSProperties = { maxHeight: 16, maxWidth: 16, borderRadius: 4 };

const chipStyle: React.CSSProperties = { borderRadius: 4 };

const bodyStyle: React.CSSProperties = { padding: 8 };

export interface Props {
  title: string;
  icon?: string | React.ReactNode;
  titleDecorator?: string | number | React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Renders a card for showing a key-value pairs of details
 */
export const Card: React.FC<Props> = ({ title, titleDecorator, icon, children }) => {
  return (
    <UiCard style={outerCardStyle}>
      <Stack direction="row" spacing={2} align="center" justify="between" style={headerStackStyle}>
        <Stack direction="row" align="center" spacing={2}>
          {icon &&
            (typeof icon === 'string' ? (
              icon.startsWith('http') ? (
                <img src={icon} alt="" style={iconImageStyle} />
              ) : (
                <Icon name={icon} size={14} />
              )
            ) : (
              icon
            ))}
          <Text weight="semibold" size="sm">
            {title}
          </Text>
        </Stack>
        {titleDecorator &&
          (typeof titleDecorator === 'string' || typeof titleDecorator === 'number' ? (
            <Chip style={chipStyle} size="sm" color="brand" variant="outline">
              {String(titleDecorator)}
            </Chip>
          ) : (
            titleDecorator
          ))}
      </Stack>
      <Separator />
      <div style={bodyStyle}>{children}</div>
    </UiCard>
  );
};

Card.displayName = 'Card';

export default Card;
