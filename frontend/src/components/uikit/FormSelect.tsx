import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormHelperText from '@mui/material/FormHelperText';
import type { SelectProps } from '@mui/material/Select';

export interface FormSelectOption {
  value: string;
  label: ReactNode;
}

export interface FormSelectProps
  extends Omit<SelectProps, 'label' | 'onChange' | 'value'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: FormSelectOption[];
  /** Show a red asterisk indicating a required field. */
  requiredMark?: boolean;
  /** Help/error text shown below the field. */
  helperText?: string;
  hint?: string;
  placeholder?: string;
}

const FormSelect = ({
  label,
  value,
  onChange,
  options,
  required,
  requiredMark,
  error,
  helperText,
  hint,
  placeholder,
  size = 'small',
  fullWidth = true,
  ...props
}: FormSelectProps) => {
  const hasError = Boolean(error);
  const effectiveHelper = hasError ? helperText : (hint ?? undefined);

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <Typography
          component="label"
          variant="body2"
          sx={{
            display: 'block',
            mb: 0.5,
            fontWeight: 700,
            color: hasError ? 'error.main' : 'text.primary',
          }}
        >
          {label}
          {(required || requiredMark) && (
            <Typography component="span" color="error.main" sx={{ ml: 0.5 }}>
              *
            </Typography>
          )}
        </Typography>
      )}
      <Select
        value={value}
        onChange={(e) => onChange(String(e.target.value))}
        size={size}
        fullWidth={fullWidth}
        displayEmpty={Boolean(placeholder)}
        error={hasError}
        {...props}
        renderValue={(selected) =>
          selected !== '' ? (
            options.find((o) => o.value === selected)?.label ?? String(selected)
          ) : placeholder ? (
            <Typography component="span" color="text.disabled">
              {placeholder}
            </Typography>
          ) : undefined
        }
        MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
      >
        {placeholder && (
          <MenuItem value="">
            <Typography color="text.disabled">{placeholder}</Typography>
          </MenuItem>
        )}
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {effectiveHelper && (
        <FormHelperText sx={{ ml: 0.5 }} error={hasError}>
          {effectiveHelper}
        </FormHelperText>
      )}
    </Box>
  );
};

export default FormSelect;
