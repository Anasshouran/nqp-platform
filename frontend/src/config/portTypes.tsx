import type { ReactElement } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { accentTokens } from '../styles/theme';

export interface PortTypeMeta {
  label: string;
  /** Block fill — always safe for white ink. */
  fill: string;
  /** Ink for chips and tinted icon blocks on light surfaces. */
  tone: string;
  icon: ReactElement;
  /** Outlined chip styling in the type's tone. */
  chipSx: SxProps<Theme>;
  /** Tinted icon block (icon on a low-alpha wash of the type colour). */
  iconBlockSx: SxProps<Theme>;
}

export const PORT_TYPE_META: Record<string, PortTypeMeta> = {
  AIRPORT: {
    label: 'مطار',
    fill: accentTokens.air,
    tone: '#1d5679',
    icon: <FlightIcon />,
    chipSx: { color: '#1d5679', borderColor: 'rgba(29,86,121,0.45)' },
    iconBlockSx: { color: '#1d5679', bgcolor: 'rgba(47,111,159,0.12)' },
  },
  SEAPORT: {
    label: 'ميناء',
    fill: accentTokens.sea,
    tone: '#6f5516',
    icon: <DirectionsBoatIcon />,
    chipSx: { color: '#6f5516', borderColor: 'rgba(111,85,22,0.45)' },
    iconBlockSx: { color: '#6f5516', bgcolor: 'rgba(140,109,31,0.12)' },
  },
  LAND_PORT: {
    label: 'معبر بري',
    fill: accentTokens.land,
    tone: '#8c3f38',
    icon: <DirectionsBusIcon />,
    chipSx: { color: '#8c3f38', borderColor: 'rgba(140,63,56,0.45)' },
    iconBlockSx: { color: '#8c3f38', bgcolor: 'rgba(179,84,75,0.12)' },
  },
};

export const portTypeMeta = (type: string): PortTypeMeta =>
  PORT_TYPE_META[type] ?? {
    label: type,
    fill: accentTokens.brand,
    tone: '#075e4d',
    icon: <LocationOnIcon />,
    chipSx: { color: '#075e4d', borderColor: 'rgba(7,94,77,0.45)' },
    iconBlockSx: { color: '#075e4d', bgcolor: 'rgba(14,138,114,0.12)' },
  };
