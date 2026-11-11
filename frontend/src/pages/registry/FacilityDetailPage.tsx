import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Paper, Typography, Tabs, Tab, CircularProgress, Alert, Stack, Chip, Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { getNode, listFacilityAssignments, listNodes, getFacilitySummary } from '../../api/endpoints/registry';
import type { HealthFacilityNodeAssignment, ReportingNode, FacilitySummary } from '../../types/registry';
import { OverviewTab } from '../../components/registry/facility/OverviewTab';
import { OwnershipTab } from '../../components/registry/facility/OwnershipTab';
import { SupervisionTab } from '../../components/registry/facility/SupervisionTab';
import { ServicesTab } from '../../components/registry/facility/ServicesTab';
import { DepartmentsTab } from '../../components/registry/facility/DepartmentsTab';
import { TreePositionTab } from '../../components/registry/facility/TreePositionTab';

export default function FacilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [node, setNode] = useState<ReportingNode | null>(null);
  const [facility, setFacility] = useState<FacilitySummary | null>(null);
  const [facilitySummary, setFacilitySummary] = useState<HealthFacilityNodeAssignment | null>(null);
  const [allNodes, setAllNodes] = useState<ReportingNode[]>([]);

  // `:id` is the HealthFacility id (M4-4-C-Part2: navigation passes node.facility_id).
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);
    setFacilitySummary(null);

    (async () => {
      try {
        // Resolve the facility's tree node via a scoped backend filter (1 request).
        const assignments = await listFacilityAssignments({ facility: id });
        if (cancelled) return;
        const match = assignments.find((a) => a.facility === id);

        // Scoped visibility gate: no visible assignment means out-of-scope (or not
        // in the registry). Do NOT fetch masterdata in that case — master-data
        // requires is_staff, which would otherwise leak out-of-scope facility info
        // to a staff-but-non-global STATE/SECTOR user.
        if (!match) {
          setNotFound(true);
          return;
        }
        setFacilitySummary(match);

        // Registry-scoped summary endpoint (D-M4-4-C-8): returns code/name/sector/
        // locality/entry_point for the visible facility without requiring is_staff.
        // Out of scope / not-found → null → page falls back to assignment name.
        const [facResult, nodeResult, nodesResult] = await Promise.all([
          getFacilitySummary(id).catch(() => null),
          getNode(match.node).catch(() => null),
          listNodes().catch(() => [] as ReportingNode[]),
        ]);
        if (cancelled) return;

        setFacility(facResult);
        setNode(nodeResult);
        setAllNodes(nodesResult);
      } catch (err: unknown) {
        if (!cancelled) {
          const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
          setError(data?.message || t('registry.facility.error.load'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id, t]);

  if (!id) {
    return <Box p={3}>{t('registry.facility.error.missing_id')}</Box>;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || notFound) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {error || t('registry.facility.error.not_found')}
        </Alert>
        <Button sx={{ mt: 2 }} startIcon={<ArrowBackIcon />} onClick={() => navigate('/app/registry/tree')}>
          {t('common.back', { defaultValue: 'رجوع' })}
        </Button>
      </Box>
    );
  }

  const facilityName = facility?.name_ar || facilitySummary?.facility_name || node?.name_ar || id;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/app/registry/tree')}>
          {t('common.back', { defaultValue: 'رجوع' })}
        </Button>
        <Typography variant="h5">{facilityName}</Typography>
        {node?.kind && <Chip label={node.kind} color="success" size="small" />}
      </Stack>

      <Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          <Tab label={t('registry.facility.tabs.overview')} />
          <Tab label={t('registry.facility.tabs.ownership')} />
          <Tab label={t('registry.facility.tabs.supervision')} />
          <Tab label={t('registry.facility.tabs.services')} />
          <Tab label={t('registry.facility.tabs.departments')} />
          <Tab label={t('registry.facility.tabs.tree_position')} />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {tab === 0 && <OverviewTab node={node} facility={facility} />}
          {tab === 1 && <OwnershipTab facilityId={id} />}
          {tab === 2 && <SupervisionTab facilityId={id} />}
          {tab === 3 && <ServicesTab facilityId={id} />}
          {tab === 4 && <DepartmentsTab facilityId={id} />}
          {tab === 5 && <TreePositionTab node={node} allNodes={allNodes} />}
        </Box>
      </Paper>
    </Box>
  );
}
