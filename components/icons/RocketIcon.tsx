import React from 'react';

const RocketIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg 
    className={className}
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.82m5.84-2.56v4.82a6 6 0 01-1.29 3.84m-4.55-15.62a3.75 3.75 0 015.3 0m0 0a3.75 3.75 0 015.3 0m-9.9 0a3.75 3.75 0 01-5.3 0m0 0a3.75 3.75 0 01-5.3 0m9.9 0l-9.9 0" 
    />
  </svg>
);

export default RocketIcon;
