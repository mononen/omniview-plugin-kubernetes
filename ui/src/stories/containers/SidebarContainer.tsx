import { Chip, IconButton, Separator, Stack, Text } from '@omniviewdev/base-ui';
import { type FC } from 'react';
import { LuX } from 'react-icons/lu';

import DynamicIcon from '../components/DynamicIcon';

import styles from './SidebarContainer.module.css';

const containerStyle: React.CSSProperties = {
  borderRadius: 6,
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxHeight: 'calc(100vh - 64px)',
  minHeight: 'calc(100vh - 64px)',
  overflow: 'auto',
};

const titleTextStyle: React.CSSProperties = { flexGrow: 1 };

type Props = {
  icon?: string | React.ReactNode;
  type: string;
  title: string;
  decorator?: string | React.ReactNode;
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
};

type JSONValue = string | number | boolean | JSONObject | JSONArray;

interface JSONObject {
  [x: string]: JSONValue;
}

type JSONArray = Array<JSONValue>;

const ResourceDrawerDecorator: FC<{
  icon: string | React.ReactNode;
  type: string;
}> = ({ icon, type }) => {
  return (
    <Chip
      size="lg"
      variant="soft"
      startDecorator={typeof icon === 'string' ? <DynamicIcon name={icon} size={16} /> : icon}
    >
      <Text weight="semibold" size="sm">
        {type}
      </Text>
    </Chip>
  );
};

const ResourceDrawerContainer: FC<Props> = ({ icon, type, title, children }) => (
  <div style={containerStyle}>
    <Stack direction="row" align="center" justify="between">
      <Chip size="lg" variant="ghost">
        <Text style={titleTextStyle}>{title}</Text>
      </Chip>
      <Stack direction="row" spacing={2}>
        <ResourceDrawerDecorator icon={icon ?? 'LuBox'} type={type} />
        <IconButton variant="outline" size="sm" aria-label="Close" onClick={() => {}}>
          <LuX size={20} />
        </IconButton>
      </Stack>
    </Stack>
    <Separator />
    <div className={styles.content}>{children}</div>
  </div>
);

export default ResourceDrawerContainer;
