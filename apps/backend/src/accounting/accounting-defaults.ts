import { AccountType } from '@prisma/client';

export interface DefaultAccountDefinition {
  code: string;
  name: string;
  type: AccountType;
  isSystem?: boolean;
}

export interface DefaultMappingDefinition {
  eventType: string;
  debitCode: string;
  creditCode: string;
  requiresVatAccount?: boolean;
}

export const DEFAULT_ACCOUNT_DEFINITIONS: DefaultAccountDefinition[] = [
  { code: 'CASH', name: 'Cash on Hand', type: AccountType.ASSET, isSystem: true },
  { code: 'BANK', name: 'Bank Account', type: AccountType.ASSET, isSystem: true },
  {
    code: 'ACCOUNTS_RECEIVABLE',
    name: 'Accounts Receivable',
    type: AccountType.ASSET,
    isSystem: true,
  },
  {
    code: 'ACCOUNTS_PAYABLE',
    name: 'Accounts Payable',
    type: AccountType.LIABILITY,
    isSystem: true,
  },
  { code: 'SALES_REVENUE', name: 'Sales Revenue', type: AccountType.REVENUE, isSystem: true },
  {
    code: 'SALES_RETURNS',
    name: 'Sales Returns',
    type: AccountType.CONTRA_REVENUE,
    isSystem: true,
  },
  { code: 'VAT_PAYABLE', name: 'VAT Payable', type: AccountType.LIABILITY, isSystem: true },
  { code: 'INVENTORY', name: 'Inventory', type: AccountType.ASSET, isSystem: true },
  { code: 'COGS', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, isSystem: true },
  {
    code: 'OPERATING_EXPENSES',
    name: 'Operating Expenses',
    type: AccountType.EXPENSE,
    isSystem: true,
  },
];

export const DEFAULT_ACCOUNT_MAPPINGS: DefaultMappingDefinition[] = [
  {
    eventType: 'SALE_CASH',
    debitCode: 'CASH',
    creditCode: 'SALES_REVENUE',
    requiresVatAccount: true,
  },
  {
    eventType: 'SALE_CARD',
    debitCode: 'BANK',
    creditCode: 'SALES_REVENUE',
    requiresVatAccount: true,
  },
  {
    eventType: 'SALE_CREDIT',
    debitCode: 'ACCOUNTS_RECEIVABLE',
    creditCode: 'SALES_REVENUE',
    requiresVatAccount: true,
  },
  {
    eventType: 'REFUND_CASH',
    debitCode: 'SALES_RETURNS',
    creditCode: 'CASH',
    requiresVatAccount: true,
  },
  {
    eventType: 'REFUND_CARD',
    debitCode: 'SALES_RETURNS',
    creditCode: 'BANK',
    requiresVatAccount: true,
  },
  { eventType: 'EXPENSE_CASH', debitCode: 'OPERATING_EXPENSES', creditCode: 'CASH' },
  { eventType: 'EXPENSE_BANK', debitCode: 'OPERATING_EXPENSES', creditCode: 'BANK' },
];
