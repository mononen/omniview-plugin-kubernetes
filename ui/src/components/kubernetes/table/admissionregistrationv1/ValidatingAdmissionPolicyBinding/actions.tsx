import { type DrawerComponentAction } from '@omniviewdev/runtime';
import type { ValidatingAdmissionPolicyBinding } from 'kubernetes-types/admissionregistration/v1';
import { LuTrash } from 'react-icons/lu';

import { drawerActionDeps } from '../../../../shared/drawer/actionDeps';

const resourceKey = 'admissionregistration::v1::ValidatingAdmissionPolicyBinding';

/** Drawer header and row menu actions for ValidatingAdmissionPolicyBindings. Handlers come from `drawerActionDeps`. */
export const drawerActions: Array<DrawerComponentAction<ValidatingAdmissionPolicyBinding>> = [
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
            Are you sure you want to delete the binding{' '}
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
