import { type DrawerComponentAction } from '@omniviewdev/runtime';
import type { StorageClass } from 'kubernetes-types/storage/v1';
import { LuTrash } from 'react-icons/lu';

import { drawerActionDeps } from '../../../../shared/drawer/actionDeps';

const resourceKey = 'storage::v1::StorageClass';

/** Drawer header and row menu actions for StorageClasss. Handlers come from `drawerActionDeps`. */
export const drawerActions: Array<DrawerComponentAction<StorageClass>> = [
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
            Are you sure you want to delete the StorageClass{' '}
            <code>{ctx.data?.metadata?.name}</code>?
          </>
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
