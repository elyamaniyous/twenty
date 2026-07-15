import { Select } from '@/ui/input/components/Select';
import { styled } from '@linaria/react';
import { useLayoutEffect, useRef } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type ErpTierSelectOption<Value extends string> = {
  label: string;
  value: Value;
};

export type ErpTierSelectProps<Value extends string> = {
  dropdownId: string;
  label: string;
  options: ErpTierSelectOption<Value>[];
  value: Value;
  disabled?: boolean;
  onChange: (value: Value) => void;
};

const StyledField = styled.div`
  min-width: 0;
  width: 100%;
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.light};
  display: block;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin-bottom: ${themeCssVariables.spacing[1]};
`;

const StyledAccessibleValue = styled.span`
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
`;

export const ErpTierSelect = <Value extends string>({
  dropdownId,
  label,
  options,
  value,
  disabled = false,
  onChange,
}: ErpTierSelectProps<Value>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelId = `${dropdownId}-label`;
  const selectedValueId = `${dropdownId}-selected-value`;
  const selectedOptionLabel =
    options.find((option) => option.value === value)?.label ?? value;
  const isEffectivelyDisabled = disabled || options.length <= 1;

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
    focusTarget.setAttribute(
      'aria-labelledby',
      `${labelId} ${selectedValueId}`,
    );
    focusTarget.setAttribute('aria-haspopup', 'true');
    focusTarget.setAttribute('aria-controls', `${dropdownId}-options`);
    focusTarget.setAttribute('aria-disabled', String(isEffectivelyDisabled));
    focusTarget.setAttribute('aria-expanded', 'false');
    focusTarget.tabIndex = isEffectivelyDisabled ? -1 : 0;

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
      if (!isEffectivelyDisabled) {
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

      if (dropdownTrigger.getAttribute('aria-expanded') === 'true') {
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
  }, [
    dropdownId,
    isEffectivelyDisabled,
    labelId,
    options,
    selectedValueId,
    value,
  ]);

  return (
    <StyledField ref={containerRef}>
      <StyledLabel id={labelId}>{label}</StyledLabel>
      <StyledAccessibleValue id={selectedValueId}>
        {selectedOptionLabel}
      </StyledAccessibleValue>
      <Select
        dropdownId={dropdownId}
        dropdownWidthAuto
        value={value}
        options={options}
        disabled={isEffectivelyDisabled}
        fullWidth
        selectSizeVariant="small"
        onChange={onChange}
      />
    </StyledField>
  );
};
