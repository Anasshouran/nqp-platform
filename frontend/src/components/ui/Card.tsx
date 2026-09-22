import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card = ({ children, className }: CardProps) => (
  <div className={`bg-white shadow rounded-lg p-4 ${className || ''}`}>
    {children}
  </div>
);

export default Card;
