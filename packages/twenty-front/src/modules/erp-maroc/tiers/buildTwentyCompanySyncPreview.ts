import { type ErpTier } from 'twenty-shared/erp-maroc';

type SyncCompany = {
  id: string;
  name: string;
  address?: {
    addressStreet1?: string | null;
    addressStreet2?: string | null;
    addressPostcode?: string | null;
    addressCity?: string | null;
  } | null;
};

type SyncPerson = {
  id: string;
  emails?: { primaryEmail?: string | null } | null;
  phones?: {
    primaryPhoneCallingCode?: string | null;
    primaryPhoneNumber?: string | null;
  } | null;
};

type ExistingTier = Pick<
  ErpTier,
  | 'type'
  | 'name'
  | 'email'
  | 'phone'
  | 'ice'
  | 'identifiantFiscal'
  | 'address'
  | 'city'
  | 'paymentDelayDays'
  | 'creditLimit'
  | 'compteCollectifCode'
>;

export type TwentyCompanySyncSource = 'crm' | 'erp' | 'manual';

type TwentyCompanySyncDefaultSource = Exclude<
  TwentyCompanySyncSource,
  'manual'
>;

export type TwentyCompanySyncPreviewField<T> = {
  crm: T | null;
  erp: T | null;
  proposed: T | null;
  selected: TwentyCompanySyncDefaultSource;
};

const nonBlank = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const crmPreferred = (
  crm: string | null,
  erp: string | null,
): TwentyCompanySyncPreviewField<string> => ({
  crm,
  erp,
  proposed: crm ?? erp,
  selected: crm === null ? 'erp' : 'crm',
});

const erpPreferred = <T>(
  crm: T | null,
  erp: T | null,
  fallback: T | null = null,
): TwentyCompanySyncPreviewField<T> => ({
  crm,
  erp,
  proposed: erp ?? crm ?? fallback,
  selected: erp === null && crm !== null ? 'crm' : 'erp',
});

export const buildTwentyCompanySyncPreview = (
  company: SyncCompany | null,
  person: SyncPerson | null,
  existing: ExistingTier | null,
) => {
  if (company === null) {
    throw new Error('Une entreprise CRM est requise');
  }

  const address = company.address;
  const crmAddress = [
    nonBlank(address?.addressStreet1),
    nonBlank(address?.addressStreet2),
    nonBlank(address?.addressPostcode),
  ]
    .filter((value): value is string => value !== null)
    .join(', ');
  const phoneNumber = nonBlank(person?.phones?.primaryPhoneNumber);
  const callingCode = nonBlank(person?.phones?.primaryPhoneCallingCode);
  const crmPhone =
    phoneNumber === null ? null : `${callingCode ?? ''}${phoneNumber}`;

  return {
    twentyCompanyId: company.id,
    twentyPersonId: person?.id ?? null,
    name: crmPreferred(nonBlank(company.name), nonBlank(existing?.name)),
    address: crmPreferred(
      crmAddress === '' ? null : crmAddress,
      nonBlank(existing?.address),
    ),
    city: crmPreferred(
      nonBlank(address?.addressCity),
      nonBlank(existing?.city),
    ),
    email: erpPreferred(
      nonBlank(person?.emails?.primaryEmail),
      nonBlank(existing?.email),
    ),
    phone: erpPreferred(crmPhone, nonBlank(existing?.phone)),
    ice: erpPreferred<string>(null, nonBlank(existing?.ice)),
    identifiantFiscal: erpPreferred<string>(
      null,
      nonBlank(existing?.identifiantFiscal),
    ),
    type: erpPreferred(null, existing?.type ?? null, 'CLIENT' as const),
    compteCollectifCode: erpPreferred(
      null,
      existing?.compteCollectifCode ?? null,
      '3421' as const,
    ),
    paymentDelayDays: erpPreferred(null, existing?.paymentDelayDays ?? null, 0),
    creditLimit: erpPreferred(null, existing?.creditLimit ?? null, 0),
  };
};

export type TwentyCompanySyncPreview = ReturnType<
  typeof buildTwentyCompanySyncPreview
>;
