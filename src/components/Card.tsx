import React from 'react';
import { clsx } from 'clsx';
import type { CardProps } from '../types';

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  children,
  className,
  ...props
}) => {
  return (
    <div className={clsx('card', className)} {...props}>
      {(title || subtitle || actions) && (
        <div className="card-header">
          <div className="flex justify-between items-start">
            <div>
              {title && <h3 className="card-title">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        </div>
      )}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};

export default Card;
