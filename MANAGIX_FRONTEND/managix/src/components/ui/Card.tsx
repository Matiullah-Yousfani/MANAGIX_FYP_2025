import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Adds a subtle lift + stronger shadow on hover. */
  hover?: boolean;
  /** Inner padding preset. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: React.ElementType;
};

const PAD: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-5',
  md: 'p-6',
  lg: 'p-8',
};

/**
 * The single, consistent content card for the whole app.
 * Uses the `.card` utility (see index.css) so every card looks identical
 * and premium — visible shadow, one radius, one hairline border.
 */
const Card: React.FC<CardProps> = ({
  hover = false,
  padding = 'md',
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) => (
  <Tag
    className={`card ${hover ? 'card-hover' : ''} ${PAD[padding]} ${className}`}
    {...rest}
  >
    {children}
  </Tag>
);

export default Card;
