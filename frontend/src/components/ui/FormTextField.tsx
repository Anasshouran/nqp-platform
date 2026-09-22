import { forwardRef } from 'react';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { TextFieldProps } from '@mui/material/TextField';

export interface FormTextFieldProps extends Omit<TextFieldProps, 'variant'> {
  /** Show a red asterisk indicating a required field (managed separately from HTML validation). */
  requiredMark?: boolean;
  /** Hint shown under the field when there is no error. */
  hint?: string;
}

const FormTextField = forwardRef<HTMLDivElement, FormTextFieldProps>(
  ({ label, required, requiredMark, error, helperText, hint, fullWidth = true, ...props }, ref) => {
    const hasError = Boolean(error);
    const effectiveHelper = hasError ? helperText : hint ?? ' ';
    return (
      <Box>
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
        <TextField
          ref={ref}
          fullWidth={fullWidth}
          label={undefined}
          error={hasError}
          helperText={effectiveHelper}
          required={required}
          {...props}
        />
      </Box>
    );
  }
);

FormTextField.displayName = 'FormTextField';

export default FormTextField;
