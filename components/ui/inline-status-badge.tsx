'use client'
/**
 * InlineStatusBadge — portal-based inline dropdown with optional date step
 *
 * When withDate=true the dropdown has two steps:
 *   1. List: choose the new state
 *   2. Confirm: set the date of the state change → save
 *
 * The dropdown renders via createPortal (escapes overflow:hidden ancestors).
 * Uses position:fixed with getBoundingClientRect() — same pattern as
 * Ant Design / MUI Select.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, ChevronLeft, Calendar, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface InlineStatusBadgeProps {
  value: string
  options: string[]
  variant: Record<string, any>
  onSave: (v: string, fecha?: string) => Promise<void>
  stopPropagation?: boolean
  /** When true, step 2 asks for the date of the state change */
  withDate?: boolean
}

interface DropdownPos {
  top: number
  left: number
  minWidth: number
  maxHeight: number
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function calcPosition(trigger: HTMLElement): DropdownPos {
  const rect = trigger.getBoundingClientRect()
  const GAP = 4
  const MAX_MENU = 380
  const spaceBelow = window.innerHeight - rect.bottom - GAP
  const spaceAbove = rect.top - GAP
  const openUpward = spaceBelow < 120 && spaceAbove > spaceBelow
  return {
    top: openUpward
      ? rect.top - Math.min(MAX_MENU, spaceAbove) - GAP
      : rect.bottom + GAP,
    left: Math.min(rect.left, window.innerWidth - 240),
    minWidth: Math.max(rect.width, 210),
    maxHeight: openUpward
      ? Math.min(MAX_MENU, spaceAbove)
      : Math.min(MAX_MENU, spaceBelow),
  }
}

export function InlineStatusBadge({
  value, options, variant, onSave,
  stopPropagation = false,
  withDate = false,
}: InlineStatusBadgeProps) {
  const [open, setOpen]     = useState(false)
  const [step, setStep]     = useState<'list' | 'date'>('list')
  const [pending, setPending] = useState<string>('')
  const [fecha, setFecha]   = useState(today())
  const [saving, setSaving] = useState(false)
  const [pos, setPos]       = useState<DropdownPos | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef    = useRef<HTMLDivElement>(null)

  const reposition = useCallback(() => {
    if (triggerRef.current) setPos(calcPosition(triggerRef.current))
  }, [])

  function toggle(e: React.MouseEvent) {
    if (stopPropagation) e.stopPropagation()
    if (saving) return
    if (!open && triggerRef.current) {
      setPos(calcPosition(triggerRef.current))
      setStep('list')
      setPending('')
      setFecha(today())
    }
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false) }
      if (e.key === 'Backspace' && step === 'date') { e.stopPropagation(); setStep('list') }
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, step, reposition])

  // Step 1 → 2: user picks a state
  function selectOption(e: React.MouseEvent, opt: string) {
    if (stopPropagation) e.stopPropagation()
    if (opt === value) { setOpen(false); return }
    if (withDate) {
      setPending(opt)
      setFecha(today())
      setStep('date')
      reposition()
    } else {
      doSave(opt, undefined)
    }
  }

  // Step 2: confirm with date
  async function doSave(v: string, f: string | undefined) {
    setSaving(true)
    setOpen(false)
    await onSave(v, f)
    setSaving(false)
  }

  async function confirmDate(e: React.MouseEvent) {
    if (stopPropagation) e.stopPropagation()
    await doSave(pending, fecha)
  }

  // ── Dropdown content ──────────────────────────────────────────────────────
  const dropdownContent = open && pos ? (
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
      className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
    >
      {/* ── Step 1: list ── */}
      {step === 'list' && (
        <div className="overflow-y-auto" style={{ maxHeight: pos.maxHeight }}>
          {options.map(opt => (
            <button
              key={opt}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => selectOption(e, opt)}
              className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-gray-50/80 transition-colors ${opt === value ? 'bg-gray-50' : ''}`}
            >
              <Badge variant={variant[opt] ?? 'secondary'} className="text-xs">{opt}</Badge>
              {opt === value && <span className="ml-auto text-[#6B1A1A] text-xs font-semibold">✓</span>}
              {withDate && opt !== value && <ChevronRight size={12} className="ml-auto text-gray-300" />}
            </button>
          ))}
        </div>
      )}

      {/* ── Step 2: confirm date ── */}
      {step === 'date' && (
        <div className="p-3 w-64">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { if (stopPropagation) e.stopPropagation(); setStep('list') }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Volver"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Cambiar a</span>
            <Badge variant={variant[pending] ?? 'secondary'} className="text-xs ml-1">{pending}</Badge>
          </div>

          {/* Date input */}
          <label className="block text-xs text-gray-500 mb-1 font-medium">
            <Calendar size={11} className="inline mr-1 opacity-60" />
            Fecha del cambio
          </label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            onMouseDown={e => e.stopPropagation()}
            className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#6B1A1A] focus:border-[#6B1A1A]"
          />

          {/* Confirm button */}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={confirmDate}
            disabled={!fecha || saving}
            className="mt-3 w-full flex items-center justify-center gap-1.5 bg-[#6B1A1A] hover:bg-[#4A1010] text-white text-sm font-medium py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Check size={13} />
            Confirmar
          </button>
        </div>
      )}
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

      {typeof window !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  )
}
