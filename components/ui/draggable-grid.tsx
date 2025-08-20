'use client'

import React, { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface DraggableGridProps {
  children: React.ReactNode[]
  storageKey: string
  enabled?: boolean
  className?: string
  itemClassName?: string
}

interface DraggableItemProps {
  id: string
  children: React.ReactNode
  className?: string
}

export function DraggableItem({ id, children, className = '' }: DraggableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${className}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-10 cursor-move p-1 rounded-md bg-background/80 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity lg:block hidden"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-muted-foreground"
        >
          <path
            d="M7 2C7 1.44772 7.44772 1 8 1C8.55228 1 9 1.44772 9 2C9 2.55228 8.55228 3 8 3C7.44772 3 7 2.55228 7 2Z"
            fill="currentColor"
          />
          <path
            d="M7 6C7 5.44772 7.44772 5 8 5C8.55228 5 9 5.44772 9 6C9 6.55228 8.55228 7 8 7C7.44772 7 7 6.55228 7 6Z"
            fill="currentColor"
          />
          <path
            d="M7 10C7 9.44772 7.44772 9 8 9C8.55228 9 9 9.44772 9 10C9 10.55228 8.55228 11 8 11C7.44772 11 7 10.55228 7 10Z"
            fill="currentColor"
          />
          <path
            d="M7 14C7 13.4477 7.44772 13 8 13C8.55228 13 9 13.4477 9 14C9 14.5523 8.55228 15 8 15C7.44772 15 7 14.5523 7 14Z"
            fill="currentColor"
          />
          <path
            d="M7 18C7 17.4477 7.44772 17 8 17C8.55228 17 9 17.4477 9 18C9 18.5523 8.55228 19 8 19C7.44772 19 7 18.5523 7 18Z"
            fill="currentColor"
          />
          <path
            d="M11 2C11 1.44772 11.4477 1 12 1C12.5523 1 13 1.44772 13 2C13 2.55228 12.5523 3 12 3C11.4477 3 11 2.55228 11 2Z"
            fill="currentColor"
          />
          <path
            d="M11 6C11 5.44772 11.4477 5 12 5C12.5523 5 13 5.44772 13 6C13 6.55228 12.5523 7 12 7C11.4477 7 11 6.55228 11 6Z"
            fill="currentColor"
          />
          <path
            d="M11 10C11 9.44772 11.4477 9 12 9C12.5523 9 13 9.44772 13 10C13 10.55228 12.5523 11 12 11C11.4477 11 11 10.55228 11 10Z"
            fill="currentColor"
          />
          <path
            d="M11 14C11 13.4477 11.4477 13 12 13C12.5523 13 13 13.4477 13 14C13 14.5523 12.5523 15 12 15C11.4477 15 11 14.5523 11 14Z"
            fill="currentColor"
          />
          <path
            d="M11 18C11 17.4477 11.4477 17 12 17C12.5523 17 13 17.4477 13 18C13 18.5523 12.5523 19 12 19C11.4477 19 11 18.5523 11 18Z"
            fill="currentColor"
          />
        </svg>
      </div>
      {children}
    </div>
  )
}

export function DraggableGrid({
  children,
  storageKey,
  enabled = true,
  className = '',
  itemClassName = '',
}: DraggableGridProps) {
  const [items, setItems] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Initialize items from localStorage or children order
  useEffect(() => {
    const storedOrder = localStorage.getItem(`draggable-grid-${storageKey}`)
    if (storedOrder) {
      try {
        const parsed = JSON.parse(storedOrder)
        setItems(parsed)
      } catch {
        // If parsing fails, initialize with default order
        setItems(React.Children.map(children, (_, index) => `item-${index}`) || [])
      }
    } else {
      setItems(React.Children.map(children, (_, index) => `item-${index}`) || [])
    }
  }, [children, storageKey])

  // Save order to localStorage whenever it changes
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem(`draggable-grid-${storageKey}`, JSON.stringify(items))
    }
  }, [items, storageKey])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  if (!enabled) {
    return <div className={className}>{children}</div>
  }

  const childrenArray = React.Children.toArray(children)
  const orderedChildren = items
    .map((id) => {
      const index = parseInt(id.split('-')[1])
      return childrenArray[index]
    })
    .filter(Boolean)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className={className}>
          {orderedChildren.map((child, index) => (
            <DraggableItem
              key={items[index]}
              id={items[index]}
              className={itemClassName}
            >
              {child}
            </DraggableItem>
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeId ? (
          <div className="opacity-80">
            {childrenArray[parseInt(activeId.split('-')[1])]}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}