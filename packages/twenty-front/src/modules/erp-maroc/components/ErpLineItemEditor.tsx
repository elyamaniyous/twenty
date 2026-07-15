import { TextInput } from '@/ui/input/components/TextInput';
import { Select } from '@/ui/input/components/Select';
import {
  formatMadCents,
  parseMadDecimalToCents,
} from '@/erp-maroc/utils/money';
import { t } from '@lingui/core/macro';
import { styled } from '@linaria/react';
import {
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  IconArrowDown,
  IconArrowUp,
  IconPlus,
  IconTrash,
} from 'twenty-ui/display';
import { Button, IconButton } from 'twenty-ui/input';
import { MOBILE_VIEWPORT, themeCssVariables } from 'twenty-ui/theme-constants';

export const ERP_TVA_RATES = [0, 7, 10, 14, 20] as const;
export type ErpTvaRate = (typeof ERP_TVA_RATES)[number];

export type ErpLineItemDraft = {
  id: string;
  productId?: string | null;
  description: string;
  unit?: string | null;
  quantity: string;
  unitPriceHt: string;
  tvaRate: ErpTvaRate;
};

export type ErpLineItemEditorProps = {
  items: ErpLineItemDraft[];
  onChange: (items: ErpLineItemDraft[]) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  disabled?: boolean;
};

type LineTotals = {
  totalHtCents: number;
  totalTvaCents: number;
  totalTtcCents: number;
};

type LineCalculation =
  | ({ status: 'valid' } & LineTotals)
  | {
      status: 'invalid';
      reason: 'invalid-input' | 'overflow';
    };

const QUANTITY_PATTERN = /^(\d+)(?:[.,](\d{1,6}))?$/;

const roundPositiveRatio = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator / 2n) / denominator;

const invalidCalculation = (
  reason: Extract<LineCalculation, { status: 'invalid' }>['reason'],
): LineCalculation => ({ status: 'invalid', reason });

const totalsFromBigInt = (
  totalHtCents: bigint,
  totalTvaCents: bigint,
  totalTtcCents: bigint,
): LineCalculation => {
  const maximumSafeCents = BigInt(Number.MAX_SAFE_INTEGER);

  if (
    totalHtCents > maximumSafeCents ||
    totalTvaCents > maximumSafeCents ||
    totalTtcCents > maximumSafeCents
  ) {
    return invalidCalculation('overflow');
  }

  return {
    status: 'valid',
    totalHtCents: Number(totalHtCents),
    totalTvaCents: Number(totalTvaCents),
    totalTtcCents: Number(totalTtcCents),
  };
};

const aggregateErpTotals = (
  calculations: LineCalculation[],
): LineCalculation => {
  let totalHtCents = 0n;
  let totalTvaCents = 0n;
  let totalTtcCents = 0n;

  for (const calculation of calculations) {
    if (calculation.status === 'invalid') {
      return calculation;
    }

    totalHtCents += BigInt(calculation.totalHtCents);
    totalTvaCents += BigInt(calculation.totalTvaCents);
    totalTtcCents += BigInt(calculation.totalTtcCents);
  }

  return totalsFromBigInt(totalHtCents, totalTvaCents, totalTtcCents);
};

export const calculateErpLineTotals = (
  item: ErpLineItemDraft,
): LineCalculation => {
  const quantityMatch = QUANTITY_PATTERN.exec(item.quantity.trim());

  if (quantityMatch === null) {
    return invalidCalculation('invalid-input');
  }

  const fraction = quantityMatch[2] ?? '';
  const denominator = 10n ** BigInt(fraction.length);
  const quantityNumerator =
    BigInt(quantityMatch[1]) * denominator + BigInt(fraction || '0');

  if (quantityNumerator <= 0n) {
    return invalidCalculation('invalid-input');
  }

  let unitPriceCents: number;

  try {
    unitPriceCents = parseMadDecimalToCents(item.unitPriceHt);
  } catch {
    return invalidCalculation('invalid-input');
  }

  const totalHt = roundPositiveRatio(
    BigInt(unitPriceCents) * quantityNumerator,
    denominator,
  );
  const totalTva = roundPositiveRatio(totalHt * BigInt(item.tvaRate), 100n);
  const totalTtc = totalHt + totalTva;

  return totalsFromBigInt(totalHt, totalTva, totalTtc);
};

const StyledEditor = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  min-width: 0;
  width: 100%;
`;

const StyledRowsScroll = styled.div`
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  width: 100%;
`;

const StyledRows = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 880px;
`;

const StyledRow = styled.div`
  align-items: end;
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  display: grid;
  gap: ${themeCssVariables.spacing[2]};
  grid-template-columns: minmax(220px, 2fr) 100px 150px 92px 120px 120px 112px;
  min-height: 72px;
  padding: ${themeCssVariables.spacing[2]} 0;
`;

const StyledSelectField = styled.div`
  min-width: 0;
`;

const StyledSelectLabel = styled.span`
  color: ${themeCssVariables.font.color.light};
  display: block;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin-bottom: ${themeCssVariables.spacing[1]};
`;

const StyledTotal = styled.div`
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[1]};
  height: 50px;
  justify-content: flex-end;
  white-space: nowrap;
`;

const StyledTotalLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledRowActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  height: 32px;
`;

const StyledFooter = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    align-items: stretch;
    flex-direction: column;

    > :first-child {
      align-self: flex-start;
    }
  }
`;

const StyledDocumentTotals = styled.dl`
  box-sizing: border-box;
  display: grid;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[4]};
  grid-template-columns: auto minmax(104px, auto);
  margin: 0;
  max-width: 100%;

  dt {
    color: ${themeCssVariables.font.color.tertiary};
  }

  dd {
    color: ${themeCssVariables.font.color.primary};
    font-weight: ${themeCssVariables.font.weight.medium};
    margin: 0;
    text-align: right;
    white-space: nowrap;
  }

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, auto);
    width: 100%;

    dd {
      overflow-wrap: anywhere;
      white-space: normal;
    }
  }
`;

const StyledTvaBreakdownSlot = styled.div`
  grid-column: 1 / -1;
  min-height: 20px;
`;

const StyledTvaBreakdownRow = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing[4]};
  grid-template-columns: auto minmax(104px, auto);

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, auto);
  }
`;

const TVA_OPTIONS = ERP_TVA_RATES.map((rate) => ({
  label: `${rate} %`,
  value: rate,
}));

const AccessibleTvaSelect = ({
  dropdownId,
  label,
  value,
  disabled,
  onChange,
}: {
  dropdownId: string;
  label: string;
  value: ErpTvaRate;
  disabled: boolean;
  onChange: (value: ErpTvaRate) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelId = `${dropdownId}-label`;

  useLayoutEffect(() => {
    const focusTarget = Array.from(containerRef.current?.children ?? []).find(
      (element) =>
        element instanceof HTMLElement && element.hasAttribute('tabindex'),
    );

    if (!(focusTarget instanceof HTMLElement)) {
      return;
    }

    const dropdownTrigger = focusTarget.querySelector(
      `[aria-controls="${dropdownId}-options"]`,
    );

    focusTarget.setAttribute('role', 'button');
    focusTarget.setAttribute('aria-labelledby', labelId);
    focusTarget.setAttribute('aria-haspopup', 'true');
    focusTarget.setAttribute('aria-controls', `${dropdownId}-options`);
    focusTarget.setAttribute('aria-disabled', String(disabled));
    focusTarget.tabIndex = disabled ? -1 : 0;

    if (!(dropdownTrigger instanceof HTMLElement)) {
      return;
    }

    dropdownTrigger.removeAttribute('role');
    dropdownTrigger.removeAttribute('aria-labelledby');

    const syncExpandedState = () => {
      focusTarget.setAttribute(
        'aria-expanded',
        dropdownTrigger.getAttribute('aria-expanded') ?? 'false',
      );
    };
    const activate = () => {
      if (!disabled) {
        dropdownTrigger.click();
      }
    };
    const handleClick = (event: MouseEvent) => {
      if (event.target === focusTarget) {
        activate();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      activate();
    };
    const observer = new MutationObserver(syncExpandedState);

    syncExpandedState();
    focusTarget.addEventListener('click', handleClick);
    focusTarget.addEventListener('keydown', handleKeyDown);
    observer.observe(dropdownTrigger, {
      attributeFilter: ['aria-expanded'],
      attributes: true,
    });

    return () => {
      observer.disconnect();
      focusTarget.removeEventListener('click', handleClick);
      focusTarget.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled, dropdownId, labelId, value]);

  return (
    <StyledSelectField ref={containerRef}>
      <StyledSelectLabel id={labelId}>{label}</StyledSelectLabel>
      <Select
        dropdownId={dropdownId}
        dropdownWidth={92}
        dropdownWidthAuto={true}
        value={value}
        options={TVA_OPTIONS}
        disabled={disabled}
        fullWidth={true}
        selectSizeVariant="small"
        onChange={onChange}
      />
    </StyledSelectField>
  );
};

export const ErpLineItemEditor = ({
  items,
  onChange,
  onDirtyChange,
  disabled = false,
}: ErpLineItemEditorProps) => {
  const instanceId = useId().replaceAll(':', '');
  const totals = items.map(calculateErpLineTotals);
  const documentTotals = aggregateErpTotals(totals);
  const tvaBreakdown = ERP_TVA_RATES.filter((rate) =>
    items.some((item) => item.tvaRate === rate),
  ).map((rate) => ({
    rate,
    totals: aggregateErpTotals(
      totals.filter((_, index) => items[index].tvaRate === rate),
    ),
  }));
  const calculationError = t`Calcul impossible`;

  const formatCalculatedTotal = (
    calculation: LineCalculation,
    field: keyof LineTotals,
  ) =>
    calculation.status === 'valid'
      ? formatMadCents(calculation[field])
      : calculationError;

  const commit = (nextItems: ErpLineItemDraft[]) => {
    onChange(nextItems);
    onDirtyChange?.(true);
  };

  const updateItem = (
    id: string,
    patch: Partial<Omit<ErpLineItemDraft, 'id'>>,
  ) => {
    commit(
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const destination = index + direction;

    if (destination < 0 || destination >= items.length) {
      return;
    }

    const nextItems = [...items];
    [nextItems[index], nextItems[destination]] = [
      nextItems[destination],
      nextItems[index],
    ];
    commit(nextItems);
  };

  const handleReorderKey = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    moveItem(index, event.key === 'ArrowUp' ? -1 : 1);
  };

  const addItem = () => {
    const idPrefix = `erp-line-${instanceId}-`;
    let idSuffix = 1;

    while (items.some(({ id }) => id === `${idPrefix}${idSuffix}`)) {
      idSuffix += 1;
    }

    commit([
      ...items,
      {
        id: `${idPrefix}${idSuffix}`,
        description: '',
        quantity: '1',
        unitPriceHt: '0.00',
        tvaRate: 20,
      },
    ]);
  };

  return (
    <StyledEditor>
      <StyledRowsScroll data-testid="erp-line-items-scroll">
        <StyledRows>
          {items.map((item, index) => {
            const lineNumber = index + 1;
            const lineTotals = totals[index];

            return (
              <StyledRow key={item.id} data-testid={`erp-line-item-${item.id}`}>
                <TextInput
                  label={t`Description ${lineNumber}`}
                  value={item.description}
                  fullWidth={true}
                  disabled={disabled}
                  onChange={(description) =>
                    updateItem(item.id, { description })
                  }
                  onKeyDown={(event) => handleReorderKey(event, index)}
                />
                <TextInput
                  label={t`Quantité ${lineNumber}`}
                  value={item.quantity}
                  fullWidth={true}
                  disabled={disabled}
                  inputMode="decimal"
                  onChange={(quantity) => updateItem(item.id, { quantity })}
                  onKeyDown={(event) => handleReorderKey(event, index)}
                />
                <TextInput
                  label={t`Prix unitaire HT ${lineNumber}`}
                  value={item.unitPriceHt}
                  fullWidth={true}
                  disabled={disabled}
                  inputMode="decimal"
                  rightAdornment="MAD"
                  onChange={(unitPriceHt) =>
                    updateItem(item.id, { unitPriceHt })
                  }
                  onKeyDown={(event) => handleReorderKey(event, index)}
                />
                <AccessibleTvaSelect
                  dropdownId={`erp-tva-${instanceId}-${item.id}`}
                  label={t`TVA ${lineNumber}`}
                  value={item.tvaRate}
                  disabled={disabled}
                  onChange={(tvaRate) => updateItem(item.id, { tvaRate })}
                />
                <StyledTotal data-testid="line-total-ht">
                  <StyledTotalLabel>{t`HT`}</StyledTotalLabel>
                  {formatCalculatedTotal(lineTotals, 'totalHtCents')}
                </StyledTotal>
                <StyledTotal data-testid="line-total-ttc">
                  <StyledTotalLabel>{t`TTC`}</StyledTotalLabel>
                  {formatCalculatedTotal(lineTotals, 'totalTtcCents')}
                </StyledTotal>
                <StyledRowActions>
                  <IconButton
                    Icon={IconArrowUp}
                    variant="secondary"
                    size="small"
                    disabled={disabled || index === 0}
                    ariaLabel={t`Monter la ligne ${lineNumber}`}
                    onClick={() => moveItem(index, -1)}
                  />
                  <IconButton
                    Icon={IconArrowDown}
                    variant="secondary"
                    size="small"
                    disabled={disabled || index === items.length - 1}
                    ariaLabel={t`Descendre la ligne ${lineNumber}`}
                    onClick={() => moveItem(index, 1)}
                  />
                  <IconButton
                    Icon={IconTrash}
                    variant="secondary"
                    accent="danger"
                    size="small"
                    disabled={disabled}
                    ariaLabel={t`Supprimer la ligne ${lineNumber}`}
                    onClick={() =>
                      commit(items.filter(({ id }) => id !== item.id))
                    }
                  />
                </StyledRowActions>
              </StyledRow>
            );
          })}
        </StyledRows>
      </StyledRowsScroll>
      <StyledFooter data-testid="erp-line-items-footer">
        <Button
          title={t`Ajouter une ligne`}
          ariaLabel={t`Ajouter une ligne`}
          Icon={IconPlus}
          variant="secondary"
          disabled={disabled}
          onClick={addItem}
        />
        <StyledDocumentTotals data-testid="erp-document-totals">
          <dt>{t`Total HT`}</dt>
          <dd>{formatCalculatedTotal(documentTotals, 'totalHtCents')}</dd>
          {tvaBreakdown.map(({ rate, totals: rateTotals }) => (
            <StyledTvaBreakdownSlot
              key={rate}
              data-testid={`document-tva-slot-${rate}`}
            >
              <StyledTvaBreakdownRow data-testid={`document-tva-rate-${rate}`}>
                <dt>{t`TVA ${rate} %`}</dt>
                <dd>{formatCalculatedTotal(rateTotals, 'totalTvaCents')}</dd>
              </StyledTvaBreakdownRow>
            </StyledTvaBreakdownSlot>
          ))}
          <dt>{t`Total TTC`}</dt>
          <dd data-testid="document-total-ttc">
            {formatCalculatedTotal(documentTotals, 'totalTtcCents')}
          </dd>
        </StyledDocumentTotals>
      </StyledFooter>
    </StyledEditor>
  );
};
