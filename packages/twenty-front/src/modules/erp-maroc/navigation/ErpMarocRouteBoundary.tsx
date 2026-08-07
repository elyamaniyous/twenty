import { useErpMarocContext } from '@/erp-maroc/context/useErpMarocContext';
import { useLingui } from '@lingui/react/macro';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { erpMarocPaths } from './erpMarocPaths';
import { resolveZowkaSpaceForPath } from './zowkaSpaces';

export const ErpMarocRouteBoundary = () => {
  const { t } = useLingui();
  const state = useErpMarocContext();
  const { pathname } = useLocation();

  switch (state.status) {
    case 'loading':
      return <div role="status">{t`Loading ERP data`}</div>;
    case 'forbidden':
      return <div role="status">{t`ERP access is not configured`}</div>;
    case 'error':
      return <div role="alert">{t`ERP is temporarily unavailable`}</div>;
    case 'ready': {
      const requestedSpace = resolveZowkaSpaceForPath(pathname);

      if (state.spaceAccess?.[requestedSpace] === false) {
        return <Navigate replace to={erpMarocPaths.crm} />;
      }

      return <Outlet />;
    }
  }
};
