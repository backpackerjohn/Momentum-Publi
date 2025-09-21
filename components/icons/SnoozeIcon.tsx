import React from 'react';

const SnoozeIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
  <svg 
    className={className}
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v1.5m0 3v1.5m0-4.5l-1.5 1.5m1.5-1.5l1.5 1.5M10.5 13.5l-1.5 1.5m1.5-1.5l1.5 1.5M7.5 12l-1.5 1.5m1.5-1.5l1.5 1.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default SnoozeIcon;
