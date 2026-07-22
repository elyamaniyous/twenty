import { parseOnboardingCsv } from './parseOnboardingCsv';

describe('parseOnboardingCsv', () => {
  it('parses a semicolon-separated French CSV', () => {
    expect(
      parseOnboardingCsv('type;nom;email\nCLIENT;Atlas;contact@atlas.ma'),
    ).toEqual([{ type: 'CLIENT', nom: 'Atlas', email: 'contact@atlas.ma' }]);
  });

  it('rejects a CSV without data rows', () => {
    expect(() => parseOnboardingCsv('type,nom\n')).toThrow(
      'Le fichier CSV ne contient aucune donnée',
    );
  });
});
