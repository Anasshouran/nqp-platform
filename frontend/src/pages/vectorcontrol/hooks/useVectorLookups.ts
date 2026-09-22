import { useCallback, useEffect, useState } from 'react';
import { getMasterEntryPoints } from '../../../api/endpoints/masterdata';
import type { MasterEntryPoint } from '../../../types/masterdata';
import {
  getChemicals,
  getFoci,
  getSites,
  getTeams,
  getVectors,
} from '../../../api/endpoints/vectorControl';
import type {
  VectorChemical,
  VectorFocus,
  VectorSite,
  VectorTeam,
  VectorRegistry,
} from '../../../types/vectorControl';

export interface VectorLookups {
  entryPoints: MasterEntryPoint[];
  vectors: VectorRegistry[];
  sites: VectorSite[];
  teams: VectorTeam[];
  foci: VectorFocus[];
  chemicals: VectorChemical[];
  loading: boolean;
  reload: () => void;
}

export function useVectorLookups(): VectorLookups {
  const [entryPoints, setEntryPoints] = useState<MasterEntryPoint[]>([]);
  const [vectors, setVectors] = useState<VectorRegistry[]>([]);
  const [sites, setSites] = useState<VectorSite[]>([]);
  const [teams, setTeams] = useState<VectorTeam[]>([]);
  const [foci, setFoci] = useState<VectorFocus[]>([]);
  const [chemicals, setChemicals] = useState<VectorChemical[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      getMasterEntryPoints({ page_size: 200 }),
      getVectors({ page_size: 200, include_inactive: 'true' }),
      getSites({ page_size: 200 }),
      getTeams({ page_size: 200 }),
      getFoci({ page_size: 200, status: 'ACTIVE' }),
      getChemicals({ page_size: 200 }),
    ]).then((results) => {
      if (!alive) return;
      const [ep, vec, sit, team, foc, chem] = results;
      if (ep.status === 'fulfilled') setEntryPoints(ep.value.data.data.results);
      if (vec.status === 'fulfilled') setVectors(vec.value.data.data.results);
      if (sit.status === 'fulfilled') setSites(sit.value.data.data.results);
      if (team.status === 'fulfilled') setTeams(team.value.data.data.results);
      if (foc.status === 'fulfilled') setFoci(foc.value.data.data.results);
      if (chem.status === 'fulfilled') setChemicals(chem.value.data.data.results);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [tick]);

  return { entryPoints, vectors, sites, teams, foci, chemicals, loading, reload };
}