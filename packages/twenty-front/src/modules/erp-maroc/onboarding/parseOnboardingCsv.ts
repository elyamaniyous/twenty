import Papa from 'papaparse';

export type OnboardingCsvRow = Record<string, string>;

export const parseOnboardingCsv = (content: string): OnboardingCsvRow[] => {
  const result = Papa.parse<OnboardingCsvRow>(content, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    const firstError = result.errors[0];
    throw new Error(
      `CSV invalide${firstError.row === undefined ? '' : ` à la ligne ${firstError.row + 1}`}: ${firstError.message}`,
    );
  }

  const headers = result.meta.fields?.filter((header) => header.trim()) ?? [];
  if (headers.length === 0) {
    throw new Error("Le fichier CSV ne contient pas d'en-têtes");
  }

  if (result.data.length === 0) {
    throw new Error('Le fichier CSV ne contient aucune donnée');
  }

  return result.data;
};
