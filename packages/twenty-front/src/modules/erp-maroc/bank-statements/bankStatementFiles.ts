import type { ErpBankStatementLine } from 'twenty-shared/erp-maroc';

const MAX_STATEMENT_BYTES = 15 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = ['.pdf', '.csv', '.sta', '.mt940'] as const;

export const bankStatementFileToBase64 = async (
  file: File,
): Promise<string> => {
  const extension = SUPPORTED_EXTENSIONS.find((candidate) =>
    file.name.toLowerCase().endsWith(candidate),
  );
  if (
    file.size === 0 ||
    file.size > MAX_STATEMENT_BYTES ||
    extension === undefined
  ) {
    throw new Error(
      'Le relevé doit être un fichier PDF, CSV ou MT940 de 15 Mo maximum',
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (
    extension === '.pdf' &&
    new TextDecoder('ascii').decode(bytes.subarray(0, 5)) !== '%PDF-'
  ) {
    throw new Error('Le fichier sélectionné n’est pas un PDF valide');
  }
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
};

export const bankStatementPdfToBase64 = bankStatementFileToBase64;

const csvCell = (value: string): string => `"${value.replaceAll('"', '""')}"`;

const amount = (value: number | null): string =>
  value === null ? '' : (value / 100).toFixed(2).replace('.', ',');

export const bankStatementLinesToCsv = (
  lines: ErpBankStatementLine[],
): string => {
  const header = [
    'Date opération',
    'Date valeur',
    'Libellé',
    'Référence',
    'Débit',
    'Crédit',
    'Solde',
  ];
  const rows = lines.map((line) =>
    [
      line.transactionDate,
      line.valueDate ?? '',
      line.description,
      line.reference ?? '',
      amount(line.debitCents),
      amount(line.creditCents),
      amount(line.balanceCents),
    ]
      .map(csvCell)
      .join(';'),
  );
  return `\uFEFF${[header.map(csvCell).join(';'), ...rows].join('\r\n')}\r\n`;
};
