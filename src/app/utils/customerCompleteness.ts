import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { prisma } from './prisma';

type CustomerDetails = {
  name?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
};

const hasValue = (value?: string | null) => Boolean(value && value.trim().length > 0);

export const getMissingCustomerFields = (customer?: CustomerDetails | null): string[] => {
  const missing: string[] = [];
  if (!hasValue(customer?.name)) missing.push('name');
  if (!hasValue(customer?.phoneNumber)) missing.push('phone number');
  if (!hasValue(customer?.address)) missing.push('address');
  return missing;
};

const joinFields = (fields: string[]) =>
  fields.length <= 1
    ? fields.join('')
    : `${fields.slice(0, -1).join(', ')} and ${fields[fields.length - 1]}`;

/**
 * A receipt / return invoice can only be created or updated when its customer
 * has a name, phone number and address on record.
 */
export const assertCustomerComplete = (
  customer: CustomerDetails | null | undefined,
  documentLabel: 'receipt' | 'return invoice',
) => {
  const missing = getMissingCustomerFields(customer);
  if (missing.length === 0) return;

  const who = customer?.name?.trim() ? `Customer "${customer.name.trim()}"` : 'Customer';
  throw new AppError(
    httpStatus.BAD_REQUEST,
    `${who} is missing ${joinFields(missing)}. Please update the customer details before saving this ${documentLabel}.`,
  );
};

export const assertCustomerCompleteById = async (
  customerId: string,
  documentLabel: 'receipt' | 'return invoice',
) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { name: true, phoneNumber: true, address: true },
  });
  if (!customer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
  }
  assertCustomerComplete(customer, documentLabel);
};
