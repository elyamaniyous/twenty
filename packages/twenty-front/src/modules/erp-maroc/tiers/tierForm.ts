import {
  buildTwentyCompanySyncPreview,
  type TwentyCompanySyncPreview,
  type TwentyCompanySyncSource,
} from '@/erp-maroc/tiers/buildTwentyCompanySyncPreview';
import { parseMadDecimalToTransportNumber } from '@/erp-maroc/utils/money';
import type { ErpTier } from 'twenty-shared/erp-maroc';

export type TwentyCompanyRecord = {
  __typename: 'Company';
  id: string;
  createdAt: string;
  name: string;
  address: {
    addressStreet1: string;
    addressStreet2: string;
    addressPostcode: string;
    addressCity: string;
  };
};

export type TwentyPersonRecord = {
  __typename: 'Person';
  id: string;
  createdAt: string;
  companyId?: string | null;
  name: { firstName: string; lastName: string };
  emails?: { primaryEmail?: string | null } | null;
  phones?: {
    primaryPhoneCallingCode?: string | null;
    primaryPhoneNumber?: string | null;
  } | null;
};

export type TierFormValues = {
  type: ErpTier['type'];
  name: string;
  email: string;
  phone: string;
  ice: string;
  identifiantFiscal: string;
  address: string;
  city: string;
  paymentDelayDays: string;
  creditLimit: string;
  compteCollectifCode: '3421' | '4411';
  isActive: boolean;
};

export type PreviewFieldKey = Exclude<
  keyof TwentyCompanySyncPreview,
  'twentyCompanyId' | 'twentyPersonId'
>;

export type SyncFormValues = {
  companySearch: string;
  companyId: string;
  personId: string;
  sources: Record<PreviewFieldKey, TwentyCompanySyncSource>;
  manualValues: Record<PreviewFieldKey, string>;
  overwriteConfirmed: boolean;
};

export type ReconciliationState = 'refreshing' | 'failed' | 'ready' | null;

export const EMPTY_TIER_FORM: TierFormValues = {
  type: 'CLIENT',
  name: '',
  email: '',
  phone: '',
  ice: '',
  identifiantFiscal: '',
  address: '',
  city: '',
  paymentDelayDays: '0',
  creditLimit: '0',
  compteCollectifCode: '3421',
  isActive: true,
};

export const PREVIEW_FIELDS: Array<{
  key: PreviewFieldKey;
  label: string;
}> = [
  { key: 'name', label: 'Nom' },
  { key: 'address', label: 'Adresse' },
  { key: 'city', label: 'Ville' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'ice', label: 'ICE' },
  { key: 'identifiantFiscal', label: 'Identifiant fiscal' },
  { key: 'type', label: 'Type' },
  { key: 'compteCollectifCode', label: 'Compte collectif' },
  { key: 'paymentDelayDays', label: 'Délai de paiement' },
  { key: 'creditLimit', label: 'Plafond de crédit' },
];

export const TIER_TYPE_OPTIONS = [
  { label: 'Client', value: 'CLIENT' },
  { label: 'Fournisseur', value: 'FOURNISSEUR' },
  { label: 'Mixte', value: 'MIXTE' },
] satisfies Array<{ label: string; value: ErpTier['type'] }>;

export const TIER_ACCOUNT_OPTIONS = [
  { label: '3421', value: '3421' },
  { label: '4411', value: '4411' },
] satisfies Array<{
  label: string;
  value: TierFormValues['compteCollectifCode'];
}>;

export const TIER_PICKER_PAGE_LIMIT = 20;

const mapPreviewFields = <Value>(getValue: (key: PreviewFieldKey) => Value) =>
  Object.fromEntries(
    PREVIEW_FIELDS.map(({ key }) => [key, getValue(key)]),
  ) as Record<PreviewFieldKey, Value>;

export const toSyncFormValues = (
  company: TwentyCompanyRecord | null,
  person: TwentyPersonRecord | null,
  existingTier: ErpTier | null,
): SyncFormValues => {
  const preview =
    company === null
      ? null
      : buildTwentyCompanySyncPreview(company, person, existingTier);

  return {
    companySearch: '',
    companyId: preview?.twentyCompanyId ?? '',
    personId: preview?.twentyPersonId ?? '',
    sources: mapPreviewFields((key) => preview?.[key].selected ?? 'erp'),
    manualValues: mapPreviewFields((key) => {
      const proposed = preview?.[key].proposed;
      return proposed === null || proposed === undefined
        ? ''
        : String(proposed);
    }),
    overwriteConfirmed: false,
  };
};

export const nullableTierValue = (value: string) => value.trim() || null;

export const parsePaymentDelayDays = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim() : String(value);

  if (!/^\d+$/.test(normalized)) {
    throw new TypeError('Payment delay must be a nonnegative integer');
  }

  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    throw new RangeError('Payment delay exceeds safe integer precision');
  }

  return parsed;
};

export const parseCreditLimit = (value: unknown) =>
  parseMadDecimalToTransportNumber(
    typeof value === 'string' ? value : String(value),
  );

export const isTierType = (value: unknown): value is ErpTier['type'] =>
  value === 'CLIENT' || value === 'FOURNISSEUR' || value === 'MIXTE';

export const isCollectiveAccount = (
  value: unknown,
): value is TierFormValues['compteCollectifCode'] =>
  value === '3421' || value === '4411';

export const toTierFormValues = (tier: ErpTier): TierFormValues => ({
  type: tier.type,
  name: tier.name,
  email: tier.email ?? '',
  phone: tier.phone ?? '',
  ice: tier.ice ?? '',
  identifiantFiscal: tier.identifiantFiscal ?? '',
  address: tier.address ?? '',
  city: tier.city ?? '',
  paymentDelayDays: String(tier.paymentDelayDays),
  creditLimit: String(tier.creditLimit),
  compteCollectifCode: tier.compteCollectifCode,
  isActive: tier.isActive,
});

export const tierPreviewValueLabel = (value: unknown) =>
  value === null || value === undefined || value === '' ? '—' : String(value);
