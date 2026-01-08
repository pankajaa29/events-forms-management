import React from 'react';

const Card = ({ children, className = '', title, actions, style = {} }) => {
    return (
        <div className={`card ${className}`} style={style}>
            {(title || actions) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    {title && <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h2>}
                    {actions && <div>{actions}</div>}
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;
