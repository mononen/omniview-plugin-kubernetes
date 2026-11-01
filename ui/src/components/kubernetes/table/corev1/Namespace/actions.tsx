import { type DrawerComponentAction } from '@omniviewdev/runtime';
import type { Namespace } from 'kubernetes-types/core/v1';
import { LuTrash } from 'react-icons/lu';

import { drawerActionDeps } from '../../../../shared/drawer/actionDeps';



/** Drawer header and row menu actions for Namespaces. Handlers come from `drawerActionDeps`. */
export const drawerActions: Array<DrawerComponentAction<Namespace>> = [
  {
    title: 'Delete',
    icon: <LuTrash />,
    action: (ctx) =>
      drawerActionDeps(ctx).show({
        title: (
          <span>
            Delete <strong>{ctx.data?.metadata?.name}</strong>?
          </span>
        ),
        body: (
          <span>
            Are you sure you want to delete the Namespace{' '}
            <code>{ctx.data?.metadata?.name}</code>? This action is irreversible.
          </span>
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
