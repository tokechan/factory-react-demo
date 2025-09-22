import React from 'react';
import { clsx } from 'clsx';
import type { InputProps } from '../types';

const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  className,
  children,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const classes = clsx(
    'input',
    {
      'error': !!error,
      'opacity-50 cursor-not-allowed': disabled,
    },
    className
  );

  return (
    <div className="w-full">
      <input
        type={type}
        placeholder={placeholder}
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className={classes}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default Input;
