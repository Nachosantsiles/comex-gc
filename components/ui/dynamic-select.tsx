'use client'
import { useEffect, useState, useRef } from 'react'
import { Plus, Check, X, Search, ChevronDown } from 'lucide-react'

interface Props {
  label?: string
  tipo: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  className?: string
  required?: boolean
}

export function DynamicSelect({ label, tipo, value, onChange, placeholder = 'Seleccionar...', className, required }: Props) {
  const [options, setOptions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [newVal, setNewVal] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const addRef = useRef<HTMLInputElement>(null)

  async function loadOptions() {
    const r = await fetch(`/api/catalogos?tipo=${tipo}`)
    if (r.ok) setOptions(await r.json())
  }

  useEffect(() => { loadOptions() }, [tipo])

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus()
  }, [open])

  useEffect(() => {
    if (adding && addRef.current) addRef.current.focus()
  }, [adding])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
        setAdding(false)
        setNewVal('')
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        setSearch('')
        setAdding(false)
        setNewVal('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  async function addOption() {
    const v = newVal.trim()
    if (!v) return
    await fetch('/api/catalogos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, valor: v }),
    })
    await loadOptions()
    onChange(v)
    setNewVal('')
    setAdding(false)
    setSearch('')
    setOpen(false)
  }

  function handleAddKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); addOption() }
    if (e.key === 'Escape') { setAdding(false); setNewVal('') }
  }

  function select(opt: string) {
    onChange(opt)
    setOpen(false)
    setSearch('')
    setAdding(false)
    setNewVal('')
  }

  const sorted = [...options].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
  const filtered = search
    ? sorted.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : sorted

  const displayValue = value || ''

  return (
    <div className={className} ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="flex gap-1">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => { setOpen(o => !o); setAdding(false); setNewVal('') }}
          className="flex-1 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#9B2828] focus:outline-none focus:ring-2 focus:ring-[#6B1A1A]/20 shadow-[0_1px_2px_rgba(15,23,42,0.04)] cursor-pointer"
          style={{ borderColor: open ? '#9B2828' : undefined }}
        >
          <span style={{ color: displayValue ? '#0f172a' : '#94a3b8' }}>
            {displayValue || placeholder}
          </span>
          <ChevronDown size={14} style={{ color: '#94a3b8', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
        </button>

        {/* Add button */}
        <button
          type="button"
          onClick={() => { setOpen(true); setAdding(true) }}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-[#6B1A1A] hover:border-[#9B2828] hover:bg-[#F5EEEE] flex-shrink-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          title="Agregar nueva opción"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: '36px',
            zIndex: 9999,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(15,23,42,0.12), 0 2px 6px rgba(15,23,42,0.06)',
            overflow: 'hidden',
          }}
        >
          {/* Search input */}
          <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                style={{
                  width: '100%',
                  padding: '5px 8px 5px 26px',
                  fontSize: '13px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  outline: 'none',
                  background: '#f8fafc',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = '#9B2828' }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
              />
            </div>
          </div>

          {/* Options list */}
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filtered.length === 0 && !adding && (
              <div style={{ padding: '10px 12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                Sin resultados
              </div>
            )}
            {filtered.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => select(opt)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  textAlign: 'left',
                  background: value === opt ? '#F5EEEE' : 'transparent',
                  color: value === opt ? '#6B1A1A' : '#1e293b',
                  border: 'none',
                  cursor: 'pointer',
                  gap: '8px',
                }}
                onMouseEnter={e => { if (value !== opt) (e.target as HTMLElement).style.background = '#f8fafc' }}
                onMouseLeave={e => { if (value !== opt) (e.target as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ flex: 1 }}>{opt}</span>
                {value === opt && <Check size={13} style={{ flexShrink: 0 }} />}
              </button>
            ))}
          </div>

          {/* Add new option inline */}
          {adding && (
            <div style={{ padding: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '6px' }}>
              <input
                ref={addRef}
                value={newVal}
                onChange={e => setNewVal(e.target.value)}
                onKeyDown={handleAddKey}
                placeholder="Nueva opción..."
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '13px',
                  border: '1px solid #9B2828',
                  borderRadius: '6px',
                  outline: 'none',
                  color: '#0f172a',
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={addOption}
                style={{ padding: '6px 10px', background: '#6B1A1A', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Check size={13} />
              </button>
              <button
                type="button"
                onClick={() => { setAdding(false); setNewVal('') }}
                style={{ padding: '6px 10px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Add option trigger (when not adding) */}
          {!adding && (
            <div style={{ borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={() => setAdding(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#6B1A1A',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5EEEE' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <Plus size={13} /> Agregar nueva opción
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
