import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Paper, Typography, Tabs, Tab, CircularProgress, Alert, Stack, Chip, Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { getNode, listFacilityAssignments, listFacilityOwnerships, listTechnicalSupervisions, listServiceAvailability, listDepartmentAssignments } from '../../api/endpoints/registry';
import { getMasterHealthFacility } from '../../api/endpoints/masterdata';
import type { ReportingNode, HealthFacilityNodeAssignment, FacilityOwnership, TechnicalSupervision, ServiceAvailability, DepartmentNodeAssignment } from '../../types/registry';
import type { MasterHealthFacility } from '../../types/masterdata';
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
  const [node, setNode] = useState<ReportingNode | null>(null);
  const [facility, setFacility] = useState<MasterHealthFacility | null>(null);
  const [facilityId, setFacilityId] = useState<string | null>(null);

  const [ownerships, setOwnerships] = useState<FacilityOwnership[]>([]);
  const [supervisions, setSupervisions] = useState<TechnicalSupervision[]>([]);
  const [services, setServices] = useState<ServiceAvailability[]>([]);
  const [departments, setDepartments] = useState<DepartmentNodeAssignment[]>([]);
  const [allNodes, setAllNodes] = useState<ReportingNode[]>([]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const nodeData = await getNode(id);
        if (cancelled) return;
        setNode(nodeData);

        // Resolve HealthFacility from node via facility assignments (scoped)
        const assignments = await listFacilityAssignments();
        if (cancelled) return;
        const match = (assignments || []).find((a: HealthFacilityNodeAssignment) => a.node === id);
        const fid = match ? match.facility : null;
        setFacilityId(fid);

        let fac: MasterHealthFacility | null = null;
        if (fid) {
          try {
            const r = await getMasterHealthFacility(fid);
            fac = (r as any)?.data?.data ?? null;
          } catch {
            fac = null;
          }
        }
        if (cancelled) return;
        setFacility(fac);

        // Load scoped lists (client-side filter by facility)
        const [owns, sups, svcs, depts, nodes] = await Promise.all([
          listFacilityOwnerships().catch(() => [] as FacilityOwnership[]),
          listTechnicalSupervisions().catch(() => [] as TechnicalSupervision[]),
          listServiceAvailability().catch(() => [] as ServiceAvailability[]),
          listDepartmentAssignments().catch(() => [] as DepartmentNodeAssignment[]),
          (await import('../../api/endpoints/registry')).listNodes().catch(() => [] as ReportingNode[]),
        ]);
        if (cancelled) return;
        setOwnerships((owns || []).filter((o) => !fid || o.facility === fid));
        setSupervisions((sups || []).filter((s) => !fid || (s as any).facility === fid));
        setServices((svcs || []).filter((s) => !fid || s.facility === fid));
        setDepartments((depts || []));
        setAllNodes(nodes || []);
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

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button sx={{ mt: 2 }} startIcon={<ArrowBackIcon />} onClick={() => navigate('/app/registry/tree')}>
          {t('common.back', { defaultValue: 'رجوع' })}
        </Button>
      </Box>
    );
  }

  const facilityName = facility?.name_ar || node?.name_ar || id;

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
          {tab === 1 && <OwnershipTab items={ownerships} />}
          {tab === 2 && <SupervisionTab items={supervisions} />}
          {tab === 3 && <ServicesTab items={services} />}
          {tab === 4 && <DepartmentsTab items={departments} />}
          {tab === 5 && <TreePositionTab node={node} allNodes={allNodes} />}
        </Box>
      </Paper>
    </Box>
  );
}