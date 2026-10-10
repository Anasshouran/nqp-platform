import Chip from '@mui/material/Chip';
import type { ChipProps } from '@mui/material/Chip';
import type { SxProps, Theme } from '@mui/material/styles';

export interface CategoryChipStyle {
  color?: ChipProps['color'];
  sx?: SxProps<Theme>;
  /** Frosted-white pill for overlaying on imagery. */
  overMedia?: SxProps<Theme>;
}

export interface CategoryChipProps {
  category: string;
  labels: Record<string, string>;
  styles: Record<string, CategoryChipStyle>;
  /** Style used for unknown categories; defaults to a neutral grey fill. */
  defaultStyle?: CategoryChipStyle;
  size?: ChipProps['size'];
  overMedia?: boolean;
  sx?: SxProps<Theme>;
}

export const NEUTRAL_CATEGORY_STYLE: CategoryChipStyle = {
  sx: { bgcolor: 'rgba(16,40,34,0.06)', color: 'text.primary' },
  overMedia: { bgcolor: 'rgba(255,255,255,0.92)', color: 'text.primary', borderColor: 'rgba(255,255,255,0.7)' },
};

export const CategoryChip = ({
  category,
  labels,
  styles,
  defaultStyle,
  size = 'small',
  overMedia = false,
  sx,
}: CategoryChipProps) => {
  const style = styles[category] ?? (defaultStyle ?? NEUTRAL_CATEGORY_STYLE);
  const fillSx = overMedia ? style.overMedia : style.sx;
  const mergedSx = [
    { fontWeight: 700, ...(overMedia ? { backdropFilter: 'blur(8px)' } : {}) },
    ...(fillSx ? [fillSx] : []),
    ...(sx ? [sx] : []),
  ] as SxProps<Theme>;
  return (
    <Chip
      label={labels[category] ?? category}
      size={size}
      color={!fillSx ? style.color : undefined}
      variant={overMedia ? 'outlined' : 'filled'}
      sx={mergedSx}
    />
  );
};

export default CategoryChip;