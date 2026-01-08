import React from 'react';

const Input = ({
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    required = false,
    error,
    name,
    className = '',
    style = {},
    ...props
}) => {
    return (
        <div className={`field ${className}`} style={{ marginBottom: '1rem', ...style }}>
            {label && (
                <label style={{ marginBottom: '0.25rem', display: 'block' }}>
                    {label} {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
                </label>
            )}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                style={{
                    borderColor: error ? 'var(--color-danger)' : undefined,
                    width: '100%'
                }}
                {...props}
            />
            {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{error}</p>}
        </div>
    );
};

export default Input;
