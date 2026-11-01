import { type DrawerComponentAction } from '@omniviewdev/runtime';
import type { Ingress } from 'kubernetes-types/networking/v1';
import { LuTrash } from 'react-icons/lu';

import { drawerActionDeps } from '../../../../shared/drawer/actionDeps';



/** Drawer header and row menu actions for Ingresss. Handlers come from `drawerActionDeps`. */
export const drawerActions: Array<DrawerComponentAction<Ingress>> = [
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
            Are you sure you want to delete the Ingress{' '}
            <code>{ctx.data?.metadata?.name}</code> from{' '}
            <strong>{ctx.data?.metadata?.namespace}</strong>?
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
