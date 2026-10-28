import { Button } from '@omniviewdev/base-ui';
import { jsonToValue, useResourceMutations, useResourceTypes } from '@omniviewdev/runtime';
import { ResourceClient } from '@omniviewdev/runtime/api';
import React from 'react';
import { LuPlus } from 'react-icons/lu';
import { parse } from 'yaml';

import { resolveKubernetesReference } from '../../../../utils/kubernetesReference';
import CreateResourceModal from './CreateResourceModal';
import { getTemplate, templateIdentity } from './templates';

interface Props {
  connectionID: string;
  resourceKey: string;
}

const CreateResourceButton: React.FC<Props> = ({ connectionID, resourceKey }) => {
  const [open, setOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isPreparing, setIsPreparing] = React.useState(false);
  const [template, setTemplate] = React.useState(getTemplate());
  const route = { connection: connectionID };
  const { resourceTypes } = useResourceTypes({ pluginID: 'kubernetes', route });
  const descriptor = resourceTypes.data?.find((entry) => entry.type === resourceKey);
  const label = descriptor?.displayName ?? resourceKey;
  const { mutate } = useResourceMutations({ pluginID: 'kubernetes' });

  const handleOpen = async () => {
    setIsPreparing(true);
    let nextTemplate = getTemplate();
    try {
      const representation = descriptor?.representations.find((entry) => entry.id === descriptor.defaultRepresentation);
      const binding = representation?.schema;
      if (binding?.documentRef) {
        const schema = await ResourceClient.GetSchemaDocument('kubernetes', route, binding.documentRef);
        nextTemplate = getTemplate(templateIdentity(schema.document, binding.root,
          descriptor?.identityDimensions.some(({ name }) => name === 'namespace') ?? false));
      }
    } catch {
      // Schema discovery is optional. Full native manifests remain creatable.
    } finally {
      setTemplate(nextTemplate);
      setIsPreparing(false);
      setOpen(true);
    }
  };

  const handleCreate = async (yaml: string) => {
    setIsCreating(true);
    try {
      const parsed = parse(yaml, { intAsBigInt: true }) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('YAML must be a Kubernetes resource object');
      const metadata = parsed.metadata as Record<string, unknown> | undefined;
      if (typeof metadata?.name !== 'string' || !metadata.name) throw new Error('metadata.name is required');
      if (metadata.namespace !== undefined && typeof metadata.namespace !== 'string') throw new Error('metadata.namespace must be a string');
      const resolved = await resolveKubernetesReference({
        connectionID, resourceType: resourceKey, name: metadata.name,
        namespace: metadata.namespace as string | undefined,
      });
      await mutate({
        route: resolved.route,
        reference: resolved.reference,
        operation: 'create',
        input: jsonToValue(parsed),
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" color="neutral" startDecorator={<LuPlus size={13} />}
        disabled={isPreparing} onClick={() => void handleOpen()}>
        {isPreparing ? 'Preparing...' : `Create ${label}`}
      </Button>
      <CreateResourceModal open={open} onClose={() => setOpen(false)} resourceKey={resourceKey}
        resourceName={label} template={template} onCreate={handleCreate} isCreating={isCreating} />
    </>
  );
};

export default CreateResourceButton;
