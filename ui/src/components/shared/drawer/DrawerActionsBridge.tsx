import {
  useConfirmationModal,
  useExec,
  useExecuteAction,
  useLogs,
  useResourceMutations,
  useRightDrawer,
  useStreamAction,
} from '@omniviewdev/runtime';
import React from 'react';

import { useClusterPreferences } from '../../../hooks/useClusterPreferences';
import ScaleModal from '../../kubernetes/actions/ScaleModal';

import { type DrawerActionDeps, registerDrawerActionDeps, registryKey, type ScaleTarget } from './actionDeps';

const PLUGIN_ID = 'kubernetes';

/** Mounts the hook-backed handlers that drawer actions use; see `actionDeps.ts`. */
type BridgeProps = {
  connectionID: string;
  resourceKey: string;
};

const DrawerActionsBridge: React.FC<BridgeProps> = ({ connectionID, resourceKey }) => {
  const { show } = useConfirmationModal();
  const { remove, update } = useResourceMutations({ pluginID: PLUGIN_ID });
  const { createLogSession } = useLogs({ pluginID: PLUGIN_ID });
  const { createSession } = useExec({ pluginID: PLUGIN_ID });
  const { executeAction, isExecuting } = useExecuteAction({ pluginID: PLUGIN_ID, connectionID, resourceKey });
  const { startStreamAction } = useStreamAction({ pluginID: PLUGIN_ID, connectionID, resourceKey });
  const { closeDrawer } = useRightDrawer();
  const { connectionOverrides } = useClusterPreferences(PLUGIN_ID);
  const nodeShellConfig = connectionOverrides[connectionID]?.nodeShellConfig;

  const [scaleTarget, setScaleTarget] = React.useState<ScaleTarget | null>(null);

  const deps = React.useMemo<DrawerActionDeps>(
    () => ({
      show,
      remove,
      update,
      createLogSession,
      createExecSession: createSession,
      executeAction,
      startStreamAction,
      closeDrawer,
      openScale: setScaleTarget,
      nodeShellConfig,
    }),
    [show, remove, update, createLogSession, createSession, executeAction, startStreamAction, closeDrawer, nodeShellConfig],
  );

  React.useEffect(
    () => registerDrawerActionDeps(registryKey(connectionID, resourceKey), deps),
    [connectionID, resourceKey, deps],
  );

  if (!scaleTarget) return null;

  return (
    <ScaleModal
      open
      onClose={() => setScaleTarget(null)}
      onConfirm={(replicas) => {
        void executeAction({
          actionID: 'scale',
          id: scaleTarget.name,
          namespace: scaleTarget.namespace,
          params: { replicas },
        }).then(() => {
          setScaleTarget(null);
          closeDrawer();
        });
      }}
      resourceType={resourceKey.split('::').pop() ?? resourceKey}
      resourceName={scaleTarget.name}
      currentReplicas={scaleTarget.replicas}
      isExecuting={isExecuting}
    />
  );
};

export default DrawerActionsBridge;
