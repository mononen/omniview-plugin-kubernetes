import { type DrawerComponentAction } from '@omniviewdev/runtime';
import type { ServiceAccount } from 'kubernetes-types/core/v1';
import { LuTrash } from 'react-icons/lu';

import { drawerActionDeps } from '../../../../shared/drawer/actionDeps';



/** Drawer header and row menu actions for ServiceAccounts. Handlers come from `drawerActionDeps`. */
export const drawerActions: Array<DrawerComponentAction<ServiceAccount>> = [
  {
    title: 'Delete',
    icon: <LuTrash />,
    action: (ctx) =>
      drawerActionDeps(ctx).show({
        title: (
          <>
            Delete <strong>{ctx.data?.metadata?.name}</strong>?
          </>
        ),
        body: (
          <>
            Are you sure you want to delete ServiceAccount{' '}
            <code>{ctx.data?.metadata?.name}</code>?
          </>
        ),
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        onConfirm: async () => {
          await drawerActionDeps(ctx).mutate({ route: ctx.resource!.route, reference: ctx.resource!.reference, operation: 'delete', input: { kind: 'map', value: {} } });
          drawerActionDeps(ctx).closeDrawer();
        },
      }),
  },
];
