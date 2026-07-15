import { buildTwentyCompanySyncPreview } from '@/erp-maroc/tiers/buildTwentyCompanySyncPreview';

const company = {
  id: 'company-1',
  name: 'Atlas Distribution',
  address: {
    addressStreet1: '12 avenue Hassan II',
    addressStreet2: 'Bureau 4',
    addressPostcode: '20000',
    addressCity: 'Casablanca',
  },
};

const person = {
  id: 'person-1',
  emails: { primaryEmail: 'contact@atlas.example' },
  phones: {
    primaryPhoneCallingCode: '+212',
    primaryPhoneNumber: '612345678',
  },
};

const existing = {
  type: 'MIXTE' as const,
  name: 'Atlas historique',
  email: 'erp@atlas.example',
  phone: '+212500000000',
  ice: '001122334455667',
  identifiantFiscal: 'IF-42',
  address: 'Ancienne adresse',
  city: 'Rabat',
  paymentDelayDays: 45,
  creditLimit: 12500.5,
  compteCollectifCode: '3421' as const,
};

describe('buildTwentyCompanySyncPreview', () => {
  it('maps company and person values while preserving protected ERP values by default', () => {
    const preview = buildTwentyCompanySyncPreview(company, person, existing);

    expect(preview).toMatchObject({
      twentyCompanyId: 'company-1',
      twentyPersonId: 'person-1',
      name: {
        crm: 'Atlas Distribution',
        erp: 'Atlas historique',
        proposed: 'Atlas Distribution',
        selected: 'crm',
      },
      address: {
        crm: '12 avenue Hassan II, Bureau 4, 20000',
        erp: 'Ancienne adresse',
        proposed: '12 avenue Hassan II, Bureau 4, 20000',
        selected: 'crm',
      },
      city: {
        crm: 'Casablanca',
        erp: 'Rabat',
        proposed: 'Casablanca',
        selected: 'crm',
      },
      email: {
        crm: 'contact@atlas.example',
        erp: 'erp@atlas.example',
        proposed: 'erp@atlas.example',
        selected: 'erp',
      },
      phone: {
        crm: '+212612345678',
        erp: '+212500000000',
        proposed: '+212500000000',
        selected: 'erp',
      },
      ice: {
        crm: null,
        erp: '001122334455667',
        proposed: '001122334455667',
        selected: 'erp',
      },
      identifiantFiscal: {
        crm: null,
        erp: 'IF-42',
        proposed: 'IF-42',
        selected: 'erp',
      },
      paymentDelayDays: {
        crm: null,
        erp: 45,
        proposed: 45,
        selected: 'erp',
      },
      creditLimit: {
        crm: null,
        erp: 12500.5,
        proposed: 12500.5,
        selected: 'erp',
      },
      type: { proposed: 'MIXTE', selected: 'erp' },
      compteCollectifCode: { proposed: '3421', selected: 'erp' },
    });
  });

  it('allows a missing person and uses ERP defaults without inventing legal data', () => {
    const preview = buildTwentyCompanySyncPreview(company, null, null);

    expect(preview.twentyPersonId).toBeNull();
    expect(preview.email).toMatchObject({
      crm: null,
      erp: null,
      proposed: null,
    });
    expect(preview.phone).toMatchObject({
      crm: null,
      erp: null,
      proposed: null,
    });
    expect(preview.type.proposed).toBe('CLIENT');
    expect(preview.compteCollectifCode.proposed).toBe('3421');
    expect(preview.paymentDelayDays.proposed).toBe(0);
    expect(preview.creditLimit.proposed).toBe(0);
    expect(preview.ice.proposed).toBeNull();
    expect(preview.identifiantFiscal.proposed).toBeNull();
  });

  it('rejects a missing company and keeps blank CRM name visible for resolution', () => {
    expect(() => buildTwentyCompanySyncPreview(null, person, existing)).toThrow(
      'A Twenty company is required',
    );

    const preview = buildTwentyCompanySyncPreview(
      { ...company, name: '   ' },
      null,
      existing,
    );

    expect(preview.name).toMatchObject({
      crm: null,
      erp: 'Atlas historique',
      proposed: 'Atlas historique',
      selected: 'erp',
    });
  });
});
