// src/components/Tooltip.tsx
import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  // Positioning logic
  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      switch (position) {
        case 'top':
          setCoords({
            x: rect.left + rect.width / 2,
            y: rect.top
          });
          break;
        case 'bottom':
          setCoords({
            x: rect.left + rect.width / 2,
            y: rect.bottom
          });
          break;
        case 'left':
          setCoords({
            x: rect.left,
            y: rect.top + rect.height / 2
          });
          break;
        case 'right':
          setCoords({
            x: rect.right,
            y: rect.top + rect.height / 2
          });
          break;
      }
    }
  }, [isVisible, position]);

  // Position classes based on the position prop
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 mb-1';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 translate-y-2 mt-1';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 -translate-x-2 mr-1';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 translate-x-2 ml-1';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 -translate-y-2 mb-1';
    }
  };

  return (
    <div
      className="relative inline-block"
      ref={triggerRef}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div
          className={`absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-700 rounded shadow-lg whitespace-nowrap ${getPositionClasses()}`}
        >
          {content}
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-gray-700 transform rotate-45 ${position === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1' :
                position === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1' :
                  position === 'left' ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1' :
                    'left-0 top-1/2 -translate-y-1/2 -translate-x-1'
              }`}
          />
        </div>
      )}
    </div>
  );
}