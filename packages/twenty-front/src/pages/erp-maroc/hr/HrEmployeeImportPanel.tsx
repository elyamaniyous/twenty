import { ErpFormDrawer } from '@/erp-maroc/components/ErpFormDrawer';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { styled } from '@linaria/react';
import { useEffect, useState } from 'react';
import {
  hrEmployeeImportCommitResultSchema,
  hrEmployeeImportPreviewSchema,
  hrEmployeeImportTemplateSchema,
  type HrEmployeeImportCommitResult,
  type HrEmployeeImportPreview,
} from 'twenty-shared/erp-maroc';
import { IconDownload, IconUpload } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type HrEmployeeImportPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => Promise<void>;
};

const StyledContent = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
`;

const StyledFileSection = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
`;

const StyledFileHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledFileLabel = styled.label`
  align-items: center;
  border: 1px dashed ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  min-height: 52px;
  padding: 0 ${themeCssVariables.spacing[3]};
`;

const StyledFileInput = styled.input`
  display: none;
`;

const StyledSummary = styled.section`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
`;

const StyledMetric = styled.div`
  border-right: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: 2px;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledMetricLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledMetricValue = styled.strong`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.lg};
  letter-spacing: 0;
`;

const StyledRows = styled.section`
  display: grid;
`;

const StyledRow = styled.article`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledRowHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
`;

const StyledIdentity = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;
`;

const StyledSecondary = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledIssue = styled.div<{ danger: boolean }>`
  color: ${({ danger }) =>
    danger
      ? themeCssVariables.color.red
      : themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 18px;
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  padding: ${themeCssVariables.spacing[5]} ${themeCssVariables.spacing[4]};
`;

const StyledError = styled.div`
  color: ${themeCssVariables.color.red};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledSuccess = styled.div`
  background: ${themeCssVariables.tag.background.green};
  color: ${themeCssVariables.tag.text.green};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const separator = result.indexOf(',');
      if (separator < 0) {
        reject(new Error('Format de fichier invalide'));
        return;
      }
      resolve(result.slice(separator + 1));
    };
    reader.readAsDataURL(file);
  });

const downloadBase64 = (
  fileName: string,
  mediaType: string,
  contentBase64: string,
) => {
  const bytes = Uint8Array.from(atob(contentBase64), (character) =>
    character.charCodeAt(0),
  );
  const url = URL.createObjectURL(new Blob([bytes], { type: mediaType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const HrEmployeeImportPanel = ({
  isOpen,
  onClose,
  onImported,
}: HrEmployeeImportPanelProps) => {
  const { client } = useErpMarocContext();
  const [file, setFile] = useState<File | null>(null);
  const [contentBase64, setContentBase64] = useState<string | null>(null);
  const [preview, setPreview] = useState<HrEmployeeImportPreview | null>(null);
  const [result, setResult] = useState<HrEmployeeImportCommitResult | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setContentBase64(null);
      setPreview(null);
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  const selectFile = async (nextFile: File | null) => {
    setFile(nextFile);
    setPreview(null);
    setResult(null);
    setError(null);
    if (nextFile === null) {
      setContentBase64(null);
      return;
    }
    if (!nextFile.name.toLowerCase().endsWith('.xlsx')) {
      setContentBase64(null);
      setError('Sélectionnez le modèle Zowka au format XLSX.');
      return;
    }
    if (nextFile.size > 5 * 1024 * 1024) {
      setContentBase64(null);
      setError('Le fichier XLSX doit peser au maximum 5 Mo.');
      return;
    }
    try {
      setContentBase64(await fileToBase64(nextFile));
    } catch {
      setContentBase64(null);
      setError('Le fichier XLSX ne peut pas être lu.');
    }
  };

  const downloadTemplate = async () => {
    setBusy(true);
    setError(null);
    try {
      const template = await client.request({
        method: 'GET',
        path: '/hr-core/employee-import/template',
        schema: hrEmployeeImportTemplateSchema,
      });
      downloadBase64(
        template.fileName,
        template.mediaType,
        template.contentBase64,
      );
    } catch {
      setError('Le modèle XLSX ne peut pas être téléchargé.');
    } finally {
      setBusy(false);
    }
  };

  const previewImport = async () => {
    if (file === null || contentBase64 === null) {
      setError('Sélectionnez un fichier XLSX avant la prévisualisation.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/hr-core/employee-import/preview',
          schema: hrEmployeeImportPreviewSchema,
          body: { fileName: file.name, contentBase64 },
        },
        { idempotency: 'required' },
      );
      setPreview(await intent.execute());
    } catch {
      setPreview(null);
      setError(
        'La prévisualisation a échoué. Vérifiez le format et les colonnes du modèle.',
      );
    } finally {
      setBusy(false);
    }
  };

  const commitImport = async () => {
    if (
      file === null ||
      contentBase64 === null ||
      preview === null ||
      preview.errorCount > 0
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const intent = client.createMutationIntent(
        {
          method: 'POST',
          path: '/hr-core/employee-import/commit',
          schema: hrEmployeeImportCommitResultSchema,
          body: {
            fileName: file.name,
            contentBase64,
            previewDigest: preview.previewDigest,
          },
        },
        { idempotency: 'required' },
      );
      const nextResult = await intent.execute();
      setResult(nextResult);
      await onImported();
    } catch {
      setError(
        "L'import n'a pas été appliqué. Relancez la prévisualisation avant de réessayer.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ErpFormDrawer
      isOpen={isOpen}
      title="Importer les salariés"
      description="Prévisualisez les créations et migrations avant toute écriture."
      isBusy={busy}
      onClose={onClose}
      footer={
        <>
          <Button
            title={result === null ? 'Annuler' : 'Fermer'}
            ariaLabel={result === null ? 'Annuler' : 'Fermer'}
            variant="secondary"
            disabled={busy}
            onClick={onClose}
          />
          {result === null && preview === null ? (
            <Button
              title="Prévisualiser"
              ariaLabel="Prévisualiser l’import"
              Icon={IconUpload}
              accent="blue"
              disabled={busy || contentBase64 === null}
              onClick={() => void previewImport()}
            />
          ) : result === null ? (
            <Button
              title={`Importer ${preview?.readyCount ?? 0} salariés`}
              ariaLabel={`Importer ${preview?.readyCount ?? 0} salariés`}
              Icon={IconUpload}
              accent="blue"
              disabled={
                busy ||
                preview === null ||
                preview.errorCount > 0 ||
                preview.readyCount === 0
              }
              onClick={() => void commitImport()}
            />
          ) : null}
        </>
      }
    >
      <StyledContent>
        <StyledFileSection>
          <StyledFileHeader>
            <strong>Fichier d’import</strong>
            <Button
              title="Télécharger le modèle"
              ariaLabel="Télécharger le modèle XLSX"
              Icon={IconDownload}
              variant="secondary"
              disabled={busy}
              onClick={() => void downloadTemplate()}
            />
          </StyledFileHeader>
          <StyledFileLabel>
            <IconUpload size={18} />
            <span>{file?.name ?? 'Choisir un fichier XLSX'}</span>
            <StyledFileInput
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) =>
                void selectFile(event.target.files?.[0] ?? null)
              }
            />
          </StyledFileLabel>
          {error === null ? null : <StyledError>{error}</StyledError>}
        </StyledFileSection>

        {result !== null ? (
          <StyledSuccess>
            Import terminé : {result.createdCount} créations et{' '}
            {result.migratedCount} migrations.
          </StyledSuccess>
        ) : null}

        {preview === null ? (
          <StyledEmpty>
            Utilisez le modèle Zowka. Les référentiels, doublons, dates et
            contrats seront contrôlés avant l’import.
          </StyledEmpty>
        ) : (
          <>
            <StyledSummary>
              {[
                ['Prêtes', preview.readyCount],
                ['Créations', preview.createCount],
                ['Migrations', preview.migrateCount],
                ['Erreurs', preview.errorCount],
              ].map(([label, value]) => (
                <StyledMetric key={label}>
                  <StyledMetricLabel>{label}</StyledMetricLabel>
                  <StyledMetricValue>{value}</StyledMetricValue>
                </StyledMetric>
              ))}
            </StyledSummary>
            <StyledRows>
              {preview.rows.map((row) => (
                <StyledRow key={row.rowNumber}>
                  <StyledRowHeader>
                    <StyledIdentity>
                      <strong>
                        {row.normalized.firstName} {row.normalized.lastName}
                      </strong>
                      <StyledSecondary>
                        Ligne {row.rowNumber} · {row.normalized.employeeNumber}{' '}
                        · {row.contractNumber}
                      </StyledSecondary>
                    </StyledIdentity>
                    <ErpStatusBadge
                      label={
                        row.action === 'CREATE'
                          ? 'Création'
                          : row.action === 'MIGRATE'
                            ? 'Migration'
                            : 'Bloquée'
                      }
                      tone={
                        row.action === 'CREATE'
                          ? 'success'
                          : row.action === 'MIGRATE'
                            ? 'warning'
                            : 'danger'
                      }
                    />
                  </StyledRowHeader>
                  {row.errors.map((issue) => (
                    <StyledIssue key={issue} danger>
                      {issue}
                    </StyledIssue>
                  ))}
                  {row.warnings.map((issue) => (
                    <StyledIssue key={issue} danger={false}>
                      {issue}
                    </StyledIssue>
                  ))}
                </StyledRow>
              ))}
            </StyledRows>
          </>
        )}
      </StyledContent>
    </ErpFormDrawer>
  );
};
