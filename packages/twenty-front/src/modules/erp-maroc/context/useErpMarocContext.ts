import { useContext } from 'react';

import { ErpMarocContext } from './ErpMarocContextProvider';

export const useErpMarocContext = () => {
  const value = useContext(ErpMarocContext);
  if (value === null) {
    throw new Error(
      'useErpMarocContext must be used inside ErpMarocContextProvider',
    );
  }
  return value;
};
