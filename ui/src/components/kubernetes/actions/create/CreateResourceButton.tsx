import React from 'react';
import { Button } from '@omniviewdev/ui/buttons';
import { LuPlus } from 'react-icons/lu';
import { useResourceMutations } from '@omniviewdev/runtime';
import { parse } from 'yaml';

import CreateResourceModal from './CreateResourceModal';
import { parseResourceKey } from '../../../../utils/resourceKey';

interface Props {
  connectionID: string;
  resourceKey: string;
}

const CreateResourceButton: React.FC<Props> = ({ connectionID, resourceKey }) => {
  const [open, setOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  const { kind } = parseResourceKey(resourceKey);
  const { create } = useResourceMutations({ pluginID: 'kubernetes' });

  const handleCreate = async (yaml: string, namespace: string) => {
    setIsCreating(true);
    try {
      const parsed = parse(yaml);
      await create({
        opts: {
          connectionID,
          resourceKey,
          resourceID: parsed.metadata?.name ?? '',
          namespace,
        },
        input: {
          input: parsed,
          namespace,
        },
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Button
        size="xs"
        emphasis="outline"
        color="neutral"
        startAdornment={<LuPlus size={13} />}
        onClick={() => setOpen(true)}
      >
        Create {kind}
      </Button>
      <CreateResourceModal
        open={open}
        onClose={() => setOpen(false)}
        resourceKey={resourceKey}
        onCreate={handleCreate}
        isCreating={isCreating}
      />
    </>
  );
};

export default CreateResourceButton;
