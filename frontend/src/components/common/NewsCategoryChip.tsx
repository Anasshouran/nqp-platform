import type { SxProps, Theme } from '@mui/material/styles';
import { CategoryChip } from './CategoryChip';
import { NEWS_CATEGORY_LABELS, NEWS_CATEGORY_STYLES } from './categoryMaps';

export { NEWS_CATEGORY_LABELS, NEWS_CATEGORY_STYLES } from './categoryMaps';

export interface NewsCategoryChipProps {
  category: string;
  size?: 'small' | 'medium';
  /** Frosted-white pill for overlaying on imagery (e.g. card cover). */
  overMedia?: boolean;
  sx?: SxProps<Theme>;
}

export const NewsCategoryChip = (props: NewsCategoryChipProps) => (
  <CategoryChip labels={NEWS_CATEGORY_LABELS} styles={NEWS_CATEGORY_STYLES} {...props} />
);

export default NewsCategoryChip;