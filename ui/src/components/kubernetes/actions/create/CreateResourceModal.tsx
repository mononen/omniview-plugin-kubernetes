import { Button, Dialog, Text } from '@omniviewdev/base-ui';
import React from 'react';
import { LuPlus } from 'react-icons/lu';

// project-imports
import CodeEditor from '../../../shared/CodeEditor';


const dialogStyle = { width: '90%', maxWidth: 1000, maxHeight: '90vh' } as const;
const contentStyle = {
  flex: 1,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  borderTop: '1px solid var(--ov-color-border-muted)',
} as const;
const footerStyle = { paddingTop: 12 } as const;
const editorWrapperStyle = { height: 'calc(80vh - 120px)', overflow: 'hidden' } as const;
const errorStyle = {
  paddingInline: 20,
  paddingBlock: 8,
  background: 'var(--ov-color-danger-soft)',
  borderTop: '1px solid var(--ov-color-danger)',
} as const;

interface Props {
  open: boolean;
  onClose: () => void;
  resourceKey: string;
  resourceName: string;
  template: string;
  onCreate: (yaml: string) => Promise<void>;
  isCreating?: boolean;
}

const CreateResourceModal: React.FC<Props> = ({
  open,
  onClose,
  resourceKey,
  resourceName,
  template,
  onCreate,
  isCreating,
}) => {
  const [value, setValue] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  // Reset template each time modal opens
  React.useEffect(() => {
    if (open) {
      setValue(template);
      setError(null);
    }
  }, [open, resourceKey, template]);

  const handleSubmit = async () => {
    setError(null);

    // Parse YAML
    let parsed: Record<string, unknown>;
    try {
      // Dynamic import to keep bundle lean — yaml is already installed
      const { parse } = await import('yaml');
      parsed = parse(value, { intAsBigInt: true }) as Record<string, unknown>;
    } catch (err: unknown) {
      setError(`YAML syntax error: ${err instanceof Error ? err.message : 'Invalid YAML'}`);
      return;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setError('YAML must be a valid Kubernetes resource object');
      return;
    }

    // Validate required fields
    const metadata = parsed.metadata as Record<string, unknown> | undefined;
    if (typeof metadata?.name !== 'string' || !metadata.name) {
      setError('metadata.name is required');
      return;
    }


    try {
      await onCreate(value);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create resource');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} size="xl" style={dialogStyle}>
      <Dialog.Close aria-label="Close" />
      <Dialog.Title icon={<LuPlus size={16} />}>Create {resourceName}</Dialog.Title>

      {/* Content — editor */}
      <div style={contentStyle}>
        <div style={editorWrapperStyle}>
          <CodeEditor
            filename="create.yaml"
            language="yaml"
            value={value}
            onChange={(v) => setValue(v)}
            path={`file:///${resourceKey}/create.yaml`}
            height="100%"
          />
        </div>

        {/* Inline error */}
        {error && (
          <div style={errorStyle}>
            <Text size="xs" tone="danger">
              {error}
            </Text>
          </div>
        )}
      </div>

      {/* Footer */}
      <Dialog.Footer style={footerStyle}>
        <Button size="sm" variant="ghost" color="neutral" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="solid"
          color="brand"
          disabled={isCreating}
          onClick={() => void handleSubmit()}
        >
          {isCreating ? 'Creating...' : 'Create'}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
};

export default CreateResourceModal;
