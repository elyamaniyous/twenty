import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

export const isErpMarocEnabledState = createAtomState<boolean>({
  key: 'isErpMarocEnabled',
  defaultValue: false,
});
