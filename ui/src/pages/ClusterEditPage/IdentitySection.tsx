import { Input, Separator, Stack, Text, TextArea } from '@omniviewdev/base-ui';

import AvatarEditor from '../../components/connections/AvatarEditor';

import { formRowStyle, formLabelColumnStyle, formFieldColumnStyle, formHintStyle } from './constants';
import SectionWrapper from './SectionWrapper';

const fullWidthStyle = { width: '100%' } as const;

function IdentitySection({
  displayName,
  description,
  avatarUrl,
  avatarColor,
  connName,
  onDisplayNameChange,
  onDescriptionChange,
  onAvatarUrlChange,
  onAvatarColorChange,
}: {
  displayName: string;
  description: string;
  avatarUrl: string;
  avatarColor: string;
  connName: string;
  onDisplayNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onAvatarUrlChange: (v: string) => void;
  onAvatarColorChange: (v: string) => void;
}) {
  return (
    <SectionWrapper
      title="Identity"
      description="Customize how this cluster appears in the sidebar and connection list."
    >
      <Stack direction="column" spacing={0}>
        {/* Avatar row */}
        <div style={formRowStyle}>
          <div style={formLabelColumnStyle}>
            <Text size="sm" weight="medium">
              Avatar
            </Text>
            <Text size="xs" tone="muted" style={formHintStyle}>
              Upload an image or pick a color
            </Text>
          </div>
          <AvatarEditor
            name={displayName || connName}
            avatarUrl={avatarUrl}
            avatarColor={avatarColor}
            onAvatarUrlChange={onAvatarUrlChange}
            onAvatarColorChange={onAvatarColorChange}
          />
        </div>
        <Separator />

        {/* Display name row */}
        <div style={formRowStyle}>
          <div style={formLabelColumnStyle}>
            <Text size="sm" weight="medium">
              Display Name
            </Text>
            <Text size="xs" tone="muted" style={formHintStyle}>
              Override the default context name
            </Text>
          </div>
          <div style={formFieldColumnStyle}>
            <Input.Root size="sm" style={fullWidthStyle}>
              <Input.Control
                size="sm"
                aria-label="Display name"
                placeholder={connName}
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.currentTarget.value)}
                style={fullWidthStyle}
              />
            </Input.Root>
          </div>
        </div>
        <Separator />

        {/* Description row */}
        <div style={formRowStyle}>
          <div style={formLabelColumnStyle}>
            <Text size="sm" weight="medium">
              Description
            </Text>
            <Text size="xs" tone="muted" style={formHintStyle}>
              Optional note for this cluster
            </Text>
          </div>
          <div style={formFieldColumnStyle}>
            <TextArea.Root size="sm" style={fullWidthStyle}>
              <TextArea.Control
                size="sm"
                aria-label="Description"
                rows={2}
                resize="vertical"
                placeholder="Optional description for this cluster"
                value={description}
                onChange={(e) => onDescriptionChange(e.currentTarget.value)}
                style={fullWidthStyle}
              />
            </TextArea.Root>
          </div>
        </div>
      </Stack>
    </SectionWrapper>
  );
}

export default IdentitySection;
