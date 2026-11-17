// Shared worklist for the import / export / all-requests views.
// Extracted from ClerkDashboardPage without behavioural change.
import { useTranslation } from 'react-i18next';
import type { useClerkActions } from '../../hooks/useClerkActions';
import type { useClerkNav } from '../../hooks/useClerkNav';
import type { useClerkRequests } from '../../hooks/useClerkRequests';
import { WorklistTable } from '../ClerkWorklist';
import { LIST_VIEW_META, isDraftRow } from '../../constants';

type Props = {
  actions: Pick<ReturnType<typeof useClerkActions>, 'setDeleteTarget' | 'setEditTarget' | 'openRow' | 'submitAction'>;
  nav: Pick<ReturnType<typeof useClerkNav>, 'activeView'>;
  reqs: Pick<ReturnType<typeof useClerkRequests>, 'requestFilters' | 'table'>;
};

export const ClerkListView = ({ actions, nav, reqs }: Props) => {
  const { t } = useTranslation();
  const { setDeleteTarget, setEditTarget, openRow, submitAction } = actions;
  const { activeView } = nav;
  const { requestFilters, table } = reqs;
  return (
    <>
              <WorklistTable
                table={table}
                filters={requestFilters}
                title={LIST_VIEW_META[activeView].title}
                subtitle={t('clerk.views.list.subtitle', { count: table.count })}
                onAction={(r) => (isDraftRow(r) ? setEditTarget(r) : openRow(r))}
                onDelete={(r) => setDeleteTarget(r)}
                onSend={submitAction}
              />
    </>
  );
};
