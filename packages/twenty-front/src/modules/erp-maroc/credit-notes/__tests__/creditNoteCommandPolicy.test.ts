import { getCreditNoteCommandPolicy } from '../creditNoteCommandPolicy';

const capabilities = {
  manageCreditNotes: true,
  allocateCustomerCredit: true,
};

describe('creditNoteCommandPolicy', () => {
  it('allows an accounting user to manage a non-empty draft', () => {
    expect(
      getCreditNoteCommandPolicy({
        role: 'COMPTABLE',
        capabilities,
        status: 'DRAFT',
        lineCount: 1,
        availableCreditCents: 0,
      }),
    ).toEqual({
      create: true,
      editDraft: true,
      validate: true,
      allocate: false,
      cancelDraft: true,
    });
  });

  it('forbids validation for an empty draft or without the credit-note capability', () => {
    expect(
      getCreditNoteCommandPolicy({
        role: 'ADMIN',
        capabilities,
        status: 'DRAFT',
        lineCount: 0,
        availableCreditCents: 0,
      }).validate,
    ).toBe(false);
    expect(
      getCreditNoteCommandPolicy({
        role: 'ADMIN',
        capabilities: { ...capabilities, manageCreditNotes: false },
        status: 'DRAFT',
        lineCount: 1,
        availableCreditCents: 0,
      }).validate,
    ).toBe(false);
  });

  it('allows only available validated customer credit to be allocated', () => {
    expect(
      getCreditNoteCommandPolicy({
        role: 'OWNER',
        capabilities,
        status: 'VALIDATED',
        lineCount: 1,
        availableCreditCents: 10_000,
      }).allocate,
    ).toBe(true);
    expect(
      getCreditNoteCommandPolicy({
        role: 'COMMERCIAL',
        capabilities,
        status: 'VALIDATED',
        lineCount: 1,
        availableCreditCents: 10_000,
      }).allocate,
    ).toBe(false);
  });
});
