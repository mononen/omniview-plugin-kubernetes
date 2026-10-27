import { type DrawerComponentAction } from '@omniviewdev/runtime';
import type { IngressClass } from 'kubernetes-types/networking/v1';
import { LuTrash } from 'react-icons/lu';

import { drawerActionDeps } from '../../../../shared/drawer/actionDeps';

const resourceKey = 'networking::v1::IngressClass';

/** Drawer header and row menu actions for IngressClasss. Handlers come from `drawerActionDeps`. */
export const drawerActions: Array<DrawerComponentAction<IngressClass>> = [
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
            Are you sure you want to delete the IngressClass{' '}
            <code>{ctx.data?.metadata?.name}</code>?
          </span>
        ),
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        onConfirm: async () => {
          await drawerActionDeps(ctx).remove({
            opts: {
              connectionID: ctx.resource?.connectionID ?? '',
              resourceKey,
              resourceID: ctx.data?.metadata?.name as string,
            },
            input: {},
          });
          drawerActionDeps(ctx).closeDrawer();
        },
      }),
  },
];
