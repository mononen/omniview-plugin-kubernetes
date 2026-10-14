import { Button, Dialog, Text } from '@omniviewdev/base-ui';
import React from 'react';
import { LuTriangleAlert } from 'react-icons/lu';

type Props = {
  open: boolean;
  connectionName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const DeleteConfirmationModal: React.FC<Props> = ({
  open,
  connectionName,
  onConfirm,
  onCancel,
}) => (
  <Dialog open={open} onClose={onCancel} size="sm">
    <Dialog.Title icon={<LuTriangleAlert size={20} />}>Delete Connection</Dialog.Title>
    <Dialog.Body>
      <Text>
        Are you sure you want to delete <strong>{connectionName}</strong>? This action cannot be
        undone.
      </Text>
    </Dialog.Body>
    <Dialog.Footer>
      <Button variant="solid" color="danger" onClick={onConfirm}>
        Delete
      </Button>
      <Button variant="ghost" color="neutral" onClick={onCancel}>
        Cancel
      </Button>
    </Dialog.Footer>
  </Dialog>
);

export default DeleteConfirmationModal;
