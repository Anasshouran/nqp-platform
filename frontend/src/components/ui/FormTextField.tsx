import { forwardRef, useId } from 'react';
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
  ({ label, required, requiredMark, error, helperText, hint, fullWidth = true, id, ...props }, ref) => {
    const hasError = Boolean(error);
    const effectiveHelper = hasError ? helperText : hint ?? ' ';
    // بدون `htmlFor` لا يصل الـ`<label>` إلى الحقل: يفقد الربط بين
    // التسمية والمُدخل، ولا يقرؤه قارئ الشاشة، ويفشل `getByLabelText`.
    const autoId = useId();
    const inputId = id ?? props.name ?? autoId;
    return (
      <Box>
        {label && (
          <Typography
            component="label"
            htmlFor={inputId}
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
          id={inputId}
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
