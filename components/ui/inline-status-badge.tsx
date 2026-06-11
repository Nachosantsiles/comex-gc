'use client'
/**
 * InlineStatusBadge — portal-based inline dropdown
 *
 * Renders the dropdown in document.body via createPortal so it escapes
 * any overflow:hidden / overflow-x:auto ancestor (table, Card, etc.).
 * Uses position:fixed with getBoundingClientRect() coordinates.
 * Auto-flips upward when there is not enough space below the trigger.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface InlineStatusBadgeProps {
  value: string
  options: string[]
  variant: Record<string, any>
  onSave: (v: string) => Promise<void>
  /** Pass e.stopPropagation if inside a clickable row */
  stopPropagation?: boolean
}

interface DropdownPos {
  top: number
  left: number
  minWidth: number
  maxHeight: number
  openUpward: boolean
}

function calcPosition(trigger: HTMLElement): DropdownPos {
  const rect = trigger.getBoundingClientRect()
  const GAP = 4
  const MAX_MENU = 320
  const MIN_MENU = 120
  const spaceBelow = window.innerHeight - rect.bottom - GAP
  const spaceAbove = rect.top - GAP

  // Flip upward only when clearly not enough space below
  const openUpward = spaceBelow < MIN_MENU && spaceAbove > spaceBelow

  return {
    top: openUpward
      ? rect.top - Math.min(MAX_MENU, spaceAbove) - GAP
      : rect.bottom + GAP,
    left: Math.min(rect.left, window.innerWidth - 220), // prevent right overflow
    minWidth: Math.max(rect.width, 200),
    maxHeight: openUpward
      ? Math.min(MAX_MENU, spaceAbove)
      : Math.min(MAX_MENU, spaceBelow),
    openUpward,
  }
}

export function InlineStatusBadge({
  value, options, variant, onSave, stopPropagation = false,
}: InlineStatusBadgeProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pos, setPos] = useState<DropdownPos | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const reposition = useCallback(() => {
    if (triggerRef.current) setPos(calcPosition(triggerRef.current))
  }, [])

  // Open / close
  function toggle(e: React.MouseEvent) {
    if (stopPropagation) e.stopPropagation()
    if (saving) return
    if (!open && triggerRef.current) setPos(calcPosition(triggerRef.current))
    setOpen(o => !o)
  }

  // Close on outside click, scroll, resize
  useEffect(() => {
    if (!open) return

    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    function onScroll() { reposition() }
    function onResize() { reposition() }
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }

    document.addEventListener('mousedown', onMouseDown)
    window.addEventListener('scroll', onScroll, true)   // capture: catches all scroll
    window.addEventListener('resize', onResize)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, reposition])

  async function select(e: React.MouseEvent, v: string) {
    if (stopPropagation) e.stopPropagation()
    if (v === value) { setOpen(false); return }
    setSaving(true)
    setOpen(false)
    await onSave(v)
    setSaving(false)
  }

  const menu = open && pos ? (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        minWidth: pos.minWidth,
        maxHeight: pos.maxHeight,
        zIndex: 9999,
      }}
      className="bg-white border border-gray-200 rounded-xl shadow-xl py-1 overflow-y-auto"
    >
      {options.map(opt => (
        <button
          key={opt}
          onMouseDown={e => e.stopPropagation()} // prevent outside-click firing before onClick
          onClick={e => select(e, opt)}
          className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-gray-50/80 transition-colors ${opt === value ? 'bg-gray-50' : ''}`}
        >
          <Badge variant={variant[opt] ?? 'secondary'} className="text-xs">{opt}</Badge>
          {opt === value && (
            <span className="ml-auto text-[#6B1A1A] text-xs font-semibold">✓</span>
          )}
        </button>
      ))}
    </div>
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggle}
        disabled={saving}
        title="Clic para cambiar"
        className="inline-flex items-center gap-1 group cursor-pointer disabled:cursor-wait"
      >
        <Badge variant={variant[value] ?? 'secondary'}>
          {saving ? <span className="opacity-60">···</span> : value}
        </Badge>
        <ChevronRight
          size={11}
          className={`transition-all text-gray-300 group-hover:text-gray-500 ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Portal: escapes overflow containers */}
      {typeof window !== 'undefined' && menu && createPortal(menu, document.body)}
    </>
  )
}
