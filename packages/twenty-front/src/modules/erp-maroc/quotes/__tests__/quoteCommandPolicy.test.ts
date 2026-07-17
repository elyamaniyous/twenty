import { getQuoteCommandPolicy } from '@/erp-maroc/quotes/quoteCommandPolicy';

import type { ErpContext, ErpQuote } from 'twenty-shared/erp-maroc';

const roles = ['OWNER', 'ADMIN', 'COMPTABLE', 'COMMERCIAL'] as const;

type PolicyInput = {
  role: ErpContext['role'];
  manageSalesDocuments: boolean;
  status: ErpQuote['status'];
  lineCount: number;
  convertedInvoiceId: string | null;
};

const draftInput: PolicyInput = {
  role: 'COMMERCIAL',
  manageSalesDocuments: true,
  status: 'DRAFT',
  lineCount: 1,
  convertedInvoiceId: null,
};

describe('getQuoteCommandPolicy', () => {
  it.each(roles)('allows every linked %s role to manage a draft', (role) => {
    expect(getQuoteCommandPolicy({ ...draftInput, role })).toEqual({
      manualCreate: true,
      edit: true,
      save: true,
      send: true,
      accept: false,
      reject: false,
      createOrder: false,
      convert: false,
    });
  });

  it('allows manual creation but limits edit and save to DRAFT', () => {
    expect(
      getQuoteCommandPolicy({ ...draftInput, status: 'SENT' }),
    ).toMatchObject({ manualCreate: true, edit: false, save: false });
  });

  it('requires at least one line before sending a DRAFT', () => {
    expect(getQuoteCommandPolicy({ ...draftInput, lineCount: 0 }).send).toBe(
      false,
    );
  });

  it('allows accept and reject only for SENT quotes', () => {
    expect(getQuoteCommandPolicy({ ...draftInput, status: 'SENT' })).toEqual({
      manualCreate: true,
      edit: false,
      save: false,
      send: false,
      accept: true,
      reject: true,
      createOrder: false,
      convert: false,
    });
  });

  it('allows conversion only for an unconverted ACCEPTED quote', () => {
    expect(
      getQuoteCommandPolicy({ ...draftInput, status: 'ACCEPTED' }).convert,
    ).toBe(true);
    expect(
      getQuoteCommandPolicy({
        ...draftInput,
        status: 'ACCEPTED',
        convertedInvoiceId: '55555555-5555-4555-8555-555555555555',
      }).convert,
    ).toBe(false);
  });

  it('allows creating a sales order only for an unconverted ACCEPTED quote', () => {
    expect(
      getQuoteCommandPolicy({ ...draftInput, status: 'ACCEPTED' }).createOrder,
    ).toBe(true);
    expect(
      getQuoteCommandPolicy({
        ...draftInput,
        status: 'ACCEPTED',
        convertedSalesOrderId: '66666666-6666-4666-8666-666666666666',
      }).createOrder,
    ).toBe(false);
  });

  it.each(['REJECTED', 'EXPIRED', 'CONVERTED'] as const)(
    'exposes no document command for %s',
    (status) => {
      expect(getQuoteCommandPolicy({ ...draftInput, status })).toMatchObject({
        edit: false,
        save: false,
        send: false,
        accept: false,
        reject: false,
        createOrder: false,
        convert: false,
      });
    },
  );

  it.each(roles)('exposes no command for %s without the capability', (role) => {
    expect(
      getQuoteCommandPolicy({
        ...draftInput,
        role,
        manageSalesDocuments: false,
      }),
    ).toEqual({
      manualCreate: false,
      edit: false,
      save: false,
      send: false,
      accept: false,
      reject: false,
      createOrder: false,
      convert: false,
    });
  });

  it('treats a negative or non-finite line count as empty', () => {
    expect(getQuoteCommandPolicy({ ...draftInput, lineCount: -1 }).send).toBe(
      false,
    );
    expect(
      getQuoteCommandPolicy({ ...draftInput, lineCount: Number.NaN }).send,
    ).toBe(false);
  });
});
