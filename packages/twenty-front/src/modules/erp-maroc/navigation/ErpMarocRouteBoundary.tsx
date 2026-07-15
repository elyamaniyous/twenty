import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { useLingui } from '@lingui/react/macro';
import { Outlet } from 'react-router-dom';

export const ErpMarocRouteBoundary = () => {
  const { t } = useLingui();
  const state = useErpMarocContext();

  switch (state.status) {
    case 'loading':
      return <div role="status">{t`Loading ERP data`}</div>;
    case 'forbidden':
      return <div role="status">{t`ERP access is not configured`}</div>;
    case 'error':
      return <div role="alert">{t`ERP is temporarily unavailable`}</div>;
    case 'ready':
      return <Outlet />;
  }
};
