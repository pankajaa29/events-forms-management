import React from 'react';

const Button = ({
    children,
    variant = 'primary', // primary, secondary, danger, icon
    size = 'md', // sm, md
    onClick,
    disabled = false,
    type = 'button',
    className = '',
    style = {}
}) => {
    let baseClass = 'btn';

    if (variant === 'primary') baseClass += ' btn-primary';
    else if (variant === 'secondary') baseClass += ' btn-secondary';
    else if (variant === 'danger') baseClass += ' btn-danger';
    else if (variant === 'icon') baseClass += ' btn-icon';
    else if (variant === 'text') baseClass += ' btn-text'; // Need to define btn-text if not already?

    if (size === 'sm') baseClass += ' text-sm py-1 px-2'; // Tailwind-like but we use custom classes usually. 
    // In index.css I defined .btn with standard padding. I can add inline override or utility classes.
    // For now, let's stick to base classes.

    return (
        <button
            type={type}
            className={`${baseClass} ${className}`}
            onClick={onClick}
            disabled={disabled}
            style={style}
        >
            {children}
        </button>
    );
};

export default Button;
