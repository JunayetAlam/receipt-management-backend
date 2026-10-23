import { AuthUser } from '../interface';
import { actorUserId } from './privilegedAuth';

/**
 * Archive / permanent-delete model shared by Product, Receipt and ReturnInvoice:
 * - isArchived: record is hidden from the main lists and shown in the Archive tab.
 *   Admin and Superadmin can archive and un-archive.
 * - isDeleted: permanent delete. Only Superadmin (or the privileged token) can do it,
 *   and only for archived records. Permanently deleted records are never listed again.
 */
export const archiveData = (actor: AuthUser) => ({
  isArchived: true,
  archivedAt: new Date(),
  archivedById: actorUserId(actor),
  isDeleteRequested: false,
});

export const unarchiveData = () => ({
  isArchived: false,
  archivedAt: null,
  archivedById: null,
  isDeleteRequested: false,
  deleteRequestedById: null,
  deleteRequestedAt: null,
  deleteReason: null,
});
