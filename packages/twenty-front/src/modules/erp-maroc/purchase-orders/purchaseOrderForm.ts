import type { ErpLineItemDraft } from '@/erp-maroc/components/ErpLineItemEditor';
import { parseCivilDate } from '@/erp-maroc/utils/civilDate';
import { parseMadDecimalToTransportNumber } from '@/erp-maroc/utils/money';

export type PurchaseOrderEditorFormValues = {
  supplierId: string;
  currency: 'MAD';
  issueDate: string;
  expectedDeliveryDate: string | null;
  notes: string | null;
  lines: ErpLineItemDraft[];
};

export type PurchaseOrderFormError = {
  path: string;
  code: string;
  message: string;
};

export type CreatePurchaseOrderDto = {
  societeId: string;
  supplierId: string;
  currency: 'MAD';
  issueDate: string;
  expectedDeliveryDate: string | null;
  notes: string | null;
  lines: Array<{
    productId: string | null;
    description: string;
    unit: string | null;
    quantity: number;
    unitPriceHt: number;
    tvaRate: number;
  }>;
};

export type PurchaseOrderFormParseResult =
  | { status: 'invalid'; errors: PurchaseOrderFormError[] }
  | { status: 'valid'; payload: CreatePurchaseOrderDto };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TVA_RATES = new Set([0, 7, 10, 14, 20]);

const toCivilDate = (date: Date) =>
  `${String(date.getFullYear()).padStart(4, '0')}-${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const optionalText = (value: string | null | undefined) => {
  const normalized = value?.trim() ?? '';

  return normalized.length === 0 ? null : normalized;
};

const isValidCivilDate = (value: string) => {
  try {
    parseCivilDate(value);
    return true;
  } catch {
    return false;
  }
};

export const createEmptyPurchaseOrderValues = (
  now: Date,
): PurchaseOrderEditorFormValues => ({
  supplierId: '',
  currency: 'MAD',
  issueDate: toCivilDate(now),
  expectedDeliveryDate: null,
  notes: null,
  lines: [
    {
      id: 'purchase-order-line-new-1',
      productId: null,
      description: '',
      unit: null,
      quantity: '1',
      unitPriceHt: '0.00',
      tvaRate: 20,
    },
  ],
});

export const parsePurchaseOrderForm = ({
  societeId,
  values,
}: {
  societeId: string;
  values: PurchaseOrderEditorFormValues;
}): PurchaseOrderFormParseResult => {
  const errors: PurchaseOrderFormError[] = [];
  const addError = (path: string, code: string, message: string) =>
    errors.push({ path, code, message });
  const supplierId = values.supplierId.trim();
  const issueDate = values.issueDate.trim();
  const expectedDeliveryDate = optionalText(values.expectedDeliveryDate);

  if (!UUID_PATTERN.test(societeId)) {
    addError(
      'societeId',
      'SOCIETE_ID_INVALID',
      "L'identifiant société est invalide.",
    );
  }
  if (!UUID_PATTERN.test(supplierId)) {
    addError('supplierId', 'SUPPLIER_ID_INVALID', 'Le fournisseur est requis.');
  }
  if (!isValidCivilDate(issueDate)) {
    addError(
      'issueDate',
      'ISSUE_DATE_INVALID',
      "La date d'émission est invalide.",
    );
  }
  if (
    expectedDeliveryDate !== null &&
    !isValidCivilDate(expectedDeliveryDate)
  ) {
    addError(
      'expectedDeliveryDate',
      'DELIVERY_DATE_INVALID',
      'La date de livraison est invalide.',
    );
  } else if (
    expectedDeliveryDate !== null &&
    isValidCivilDate(issueDate) &&
    expectedDeliveryDate < issueDate
  ) {
    addError(
      'expectedDeliveryDate',
      'DELIVERY_DATE_BEFORE_ISSUE_DATE',
      "La livraison ne peut pas précéder la date d'émission.",
    );
  }
  if (values.lines.length === 0) {
    addError('lines', 'LINE_REQUIRED', 'Au moins une ligne est requise.');
  }

  const lines = values.lines.flatMap((line, index) => {
    const prefix = `lines.${index}`;
    const description = line.description.trim();
    const productId = optionalText(line.productId);
    const unit = optionalText(line.unit);
    const quantity = Number(line.quantity.trim());
    let unitPriceHt: number | null = null;

    if (description.length === 0) {
      addError(
        `${prefix}.description`,
        'DESCRIPTION_REQUIRED',
        'La description est requise.',
      );
    }
    if (productId !== null && !UUID_PATTERN.test(productId)) {
      addError(
        `${prefix}.productId`,
        'PRODUCT_ID_INVALID',
        "L'identifiant produit est invalide.",
      );
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      addError(
        `${prefix}.quantity`,
        'QUANTITY_INVALID',
        'La quantité doit être positive.',
      );
    }
    try {
      unitPriceHt = parseMadDecimalToTransportNumber(line.unitPriceHt);
    } catch {
      addError(
        `${prefix}.unitPriceHt`,
        'UNIT_PRICE_INVALID',
        'Le prix HT doit être un montant MAD valide.',
      );
    }
    if (!TVA_RATES.has(line.tvaRate)) {
      addError(
        `${prefix}.tvaRate`,
        'TVA_RATE_INVALID',
        'Le taux de TVA doit être 0, 7, 10, 14 ou 20.',
      );
    }

    if (
      description.length === 0 ||
      (productId !== null && !UUID_PATTERN.test(productId)) ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      unitPriceHt === null ||
      !TVA_RATES.has(line.tvaRate)
    ) {
      return [];
    }

    return [
      {
        productId,
        description,
        unit,
        quantity,
        unitPriceHt,
        tvaRate: line.tvaRate,
      },
    ];
  });

  if (errors.length > 0) return { status: 'invalid', errors };

  return {
    status: 'valid',
    payload: {
      societeId,
      supplierId,
      currency: 'MAD',
      issueDate,
      expectedDeliveryDate,
      notes: optionalText(values.notes),
      lines,
    },
  };
};
