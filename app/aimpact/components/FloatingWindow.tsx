'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { X, Minimize2, Maximize2, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingWindowProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  hideHeader?: boolean;
}

export default function FloatingWindow({
  title,
  icon,
  children,
  isOpen,
  onClose,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 400, height: 600 },
  minWidth = 320,
  minHeight = 400,
  maxWidth = 800,
  maxHeight = 800,
  hideHeader = false,
}: FloatingWindowProps) {
  const [position, setPosition] = useState(defaultPosition);
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Initialize position on mount to ensure it's within viewport
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const maxX = window.innerWidth - size.width - 20;
      const maxY = window.innerHeight - size.height - 20;
      
      setPosition({
        x: Math.min(Math.max(20, defaultPosition.x), maxX),
        y: Math.min(Math.max(20, defaultPosition.y), maxY)
      });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  // Public method to start dragging from child components
  const startDrag = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep window within viewport
      const maxX = window.innerWidth - size.width - 20;
      const maxY = window.innerHeight - size.height - 20;
      
      setPosition({
        x: Math.min(Math.max(20, newX), maxX),
        y: Math.min(Math.max(20, newY), maxY)
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, dragStart]);

  const handleResize = (direction: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;
    
    const handleResizeMove = (e: MouseEvent) => {
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      if (direction.includes('e')) {
        newWidth = startWidth + (e.clientX - startX);
      }
      if (direction.includes('w')) {
        newWidth = startWidth - (e.clientX - startX);
      }
      if (direction.includes('s')) {
        newHeight = startHeight + (e.clientY - startY);
      }
      if (direction.includes('n')) {
        newHeight = startHeight - (e.clientY - startY);
      }
      
      setSize({
        width: Math.min(Math.max(minWidth, newWidth), maxWidth),
        height: Math.min(Math.max(minHeight, newHeight), maxHeight)
      });
    };
    
    const handleResizeEnd = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={windowRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ 
          opacity: 1, 
          scale: isMinimized ? 0.9 : 1,
          height: isMinimized ? '48px' : `${size.height}px`
        }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="fixed bg-white border border-border rounded-lg shadow-2xl overflow-hidden z-50"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          cursor: isDragging ? 'move' : 'default'
        }}
      >
        {/* Header */}
        {!hideHeader && (
          <div 
            className="bg-muted border-b px-3 py-2 flex items-center justify-between drag-handle"
            onMouseDown={handleMouseDown}
            style={{ cursor: 'move' }}
          >
            <div className="flex items-center gap-2 pointer-events-none">
              {icon}
              <span className="font-medium text-sm">{title}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? (
                  <Maximize2 className="h-3 w-3" />
                ) : (
                  <Minimize2 className="h-3 w-3" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 hover:bg-red-500/20 hover:text-red-500"
                onClick={onClose}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        {!isMinimized && (
          <div className="flex-1 overflow-auto" style={{ height: `${size.height - (hideHeader ? 0 : 40)}px` }}>
            {children}
          </div>
        )}

        {/* Resize handles */}
        {!isMinimized && !isDragging && (
          <>
            {/* Corners */}
            <div
              className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
              onMouseDown={(e) => handleResize('se', e)}
            />
            <div
              className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize"
              onMouseDown={(e) => handleResize('sw', e)}
            />
            <div
              className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize"
              onMouseDown={(e) => handleResize('ne', e)}
            />
            <div
              className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize"
              onMouseDown={(e) => handleResize('nw', e)}
            />
            
            {/* Edges */}
            <div
              className="absolute bottom-0 left-3 right-3 h-1 cursor-s-resize"
              onMouseDown={(e) => handleResize('s', e)}
            />
            <div
              className="absolute top-0 left-3 right-3 h-1 cursor-n-resize"
              onMouseDown={(e) => handleResize('n', e)}
            />
            <div
              className="absolute right-0 top-3 bottom-3 w-1 cursor-e-resize"
              onMouseDown={(e) => handleResize('e', e)}
            />
            <div
              className="absolute left-0 top-3 bottom-3 w-1 cursor-w-resize"
              onMouseDown={(e) => handleResize('w', e)}
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}