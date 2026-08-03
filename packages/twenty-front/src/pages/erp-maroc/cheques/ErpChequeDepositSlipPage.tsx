import {
  ErpOperationalTable,
  type ErpOperationalTableColumn,
} from '@/erp-maroc/components/ErpOperationalTable';
import { ErpPageShell } from '@/erp-maroc/components/ErpPageShell';
import { ErpStatusBadge } from '@/erp-maroc/components/ErpStatusBadge';
import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { formatCivilDate } from '@/erp-maroc/utils/civilDate';
import { formatMadCents } from '@/erp-maroc/utils/money';
import { styled } from '@linaria/react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  erpChequeDepositSlipSchema,
  type ErpChequeDepositSlip,
} from 'twenty-shared/erp-maroc';
import { IconDownload } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type DepositSlipLine = ErpChequeDepositSlip['lines'][number];

const StyledDetail = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledSummary = styled.dl`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  div {
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
    border-right: 1px solid ${themeCssVariables.border.color.light};
    min-width: 0;
    padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
  }

  dt {
    color: ${themeCssVariables.font.color.tertiary};
    font-size: ${themeCssVariables.font.size.sm};
    margin-bottom: ${themeCssVariables.spacing[1]};
  }

  dd {
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.md};
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

const StyledNotes = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledMessage = styled.div`
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[4]};
`;

const columns: ErpOperationalTableColumn<DepositSlipLine>[] = [
  {
    key: 'position',
    header: 'N°',
    width: '60px',
    render: (row) => row.position,
  },
  {
    key: 'cheque',
    header: 'Chèque',
    width: '150px',
    render: (row) => row.cheque.number,
  },
  {
    key: 'counterparty',
    header: 'Tireur / client',
    render: (row) => row.cheque.drawerName ?? row.cheque.counterpartyName,
  },
  {
    key: 'dueDate',
    header: 'Échéance',
    width: '130px',
    render: (row) =>
      formatCivilDate(row.cheque.dueDate ?? row.cheque.issueDate),
  },
  {
    key: 'amount',
    header: 'Montant',
    width: '160px',
    align: 'right',
    render: (row) => formatMadCents(row.cheque.amountCents),
  },
];

const csvCell = (value: string | number) =>
  `"${String(value).replaceAll('"', '""')}"`;

const triggerDownload = (blob: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const ErpChequeDepositSlipPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { client } = useErpMarocContext();
  const [slip, setSlip] = useState<ErpChequeDepositSlip | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const result = await client.request({
        method: 'GET',
        path: `/cheques/deposit-slips/${id}`,
        schema: erpChequeDepositSlipSchema,
      });
      setSlip(result);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [client, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const downloadPdf = async () => {
    if (slip === null || isDownloading) return;
    setIsDownloading(true);
    setMessage(null);
    try {
      const blob = await client.pdf({
        method: 'GET',
        path: `/cheques/deposit-slips/${slip.id}/pdf`,
        responseType: 'pdf',
      });
      triggerDownload(blob, `bordereau-${slip.number}.pdf`);
    } catch {
      setMessage('Impossible de télécharger le bordereau PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadCsv = () => {
    if (slip === null) return;
    const rows = [
      [
        'Bordereau',
        'Date remise',
        'Banque',
        'RIB',
        'Numéro chèque',
        'Tireur / client',
        'Échéance',
        'Montant MAD',
      ],
      ...slip.lines.map((line) => [
        slip.number,
        slip.depositDate,
        slip.bankAccount.bankName,
        slip.bankAccount.rib,
        line.cheque.number,
        line.cheque.drawerName ?? line.cheque.counterpartyName,
        line.cheque.dueDate ?? line.cheque.issueDate,
        (line.cheque.amountCents / 100).toFixed(2),
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
    triggerDownload(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `bordereau-${slip.number}.csv`,
    );
  };

  if (state !== 'ready' || slip === null) {
    return (
      <ErpPageShell
        title="Bordereau de remise"
        state={state}
        loadingLabel="Chargement du bordereau"
        errorLabel="Impossible de charger ce bordereau"
        retryLabel="Réessayer"
        onRetry={() => void load()}
      />
    );
  }

  return (
    <ErpPageShell
      title={`Bordereau ${slip.number}`}
      description="Remise de chèques en banque"
      actions={
        <StyledActions>
          <Link to="/erp-maroc/cheques">Retour au registre</Link>
          <Button
            title="Exporter CSV"
            ariaLabel="Exporter le bordereau en CSV"
            variant="secondary"
            Icon={IconDownload}
            onClick={downloadCsv}
          />
          <Button
            title="Télécharger PDF"
            ariaLabel="Télécharger le bordereau PDF"
            accent="blue"
            Icon={IconDownload}
            disabled={isDownloading}
            onClick={() => void downloadPdf()}
          />
        </StyledActions>
      }
    >
      <StyledDetail>
        <StyledSummary>
          <div>
            <dt>Statut</dt>
            <dd>
              <ErpStatusBadge label="Remis en banque" tone="success" />
            </dd>
          </div>
          <div>
            <dt>Date de remise</dt>
            <dd>{formatCivilDate(slip.depositDate)}</dd>
          </div>
          <div>
            <dt>Compte bancaire</dt>
            <dd>
              {slip.bankAccount.bankName} · {slip.bankAccount.name}
            </dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{formatMadCents(slip.totalAmountCents)}</dd>
          </div>
          <div>
            <dt>Nombre de chèques</dt>
            <dd>{slip.lines.length}</dd>
          </div>
          <div>
            <dt>RIB</dt>
            <dd>{slip.bankAccount.rib}</dd>
          </div>
          <div>
            <dt>Société</dt>
            <dd>{slip.societe.raisonSociale}</dd>
          </div>
          <div>
            <dt>Référence</dt>
            <dd>{slip.number}</dd>
          </div>
        </StyledSummary>
        {message === null ? null : (
          <StyledMessage role="status">{message}</StyledMessage>
        )}
        {slip.notes === null ? null : (
          <StyledNotes>Observations : {slip.notes}</StyledNotes>
        )}
        <ErpOperationalTable
          ariaLabel="Chèques du bordereau"
          columns={columns}
          rows={slip.lines}
          getRowKey={(row) => row.id}
          state="ready"
          loadingLabel="Chargement des chèques"
          emptyLabel="Aucun chèque dans ce bordereau"
          errorLabel="Impossible de charger les chèques"
        />
      </StyledDetail>
    </ErpPageShell>
  );
};
