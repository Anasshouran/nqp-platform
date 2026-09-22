import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="mb-4">
      {label && <label className="block mb-1 text-sm font-medium">{label}</label>}
      <input
        ref={ref}
        className={`w-full border rounded px-3 py-2 ${error ? 'border-red-500' : 'border-gray-300'} ${className || ''}`}
        {...props}
      />
      {error && <span className="text-red-500 text-xs mt-1">{error}</span>}
    </div>
  )
);

export default Input;
