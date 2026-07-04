import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  interactive?: boolean;
  padded?: boolean;
}

/** Standard surface container. `interactive` adds hover lift + pointer for clickable cards. */
export const Card: React.FC<CardProps> = ({
  as: Tag = 'div',
  interactive = false,
  padded = true,
  className = '',
  children,
  ...rest
}) => (
  <Tag
    className={
      `bg-surface border border-line rounded-xl ${padded ? 'p-5' : ''} ` +
      (interactive
        ? 'transition-all duration-200 cursor-pointer hover:border-line-strong hover:bg-surface-2 hover:shadow-e2 '
        : '') +
      className
    }
    {...rest}
  >
    {children}
  </Tag>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...rest }) => (
  <div className={`flex items-center justify-between gap-3 mb-4 ${className}`} {...rest}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className = '', children, ...rest }) => (
  <h3 className={`text-base font-semibold text-fg ${className}`} {...rest}>
    {children}
  </h3>
);

export default Card;
