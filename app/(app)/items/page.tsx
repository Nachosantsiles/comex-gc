'use client'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DynamicSelect } from '@/components/ui/dynamic-select'
import { Plus, Pencil, Trash2, CheckSquare, Square, ChevronDown } from 'lucide-react'
import { ESTADOS_DOC, ESTADOS_ITEM, MONEDAS, DESTINOS_FINALES } from '@/lib/constants'

const docVariant: Record<string, any> = {
  Pendiente: 'secondary', 'En Preparación': 'default', 'En Revisión': 'warning',
  Observado: 'danger', Corregido: 'orange', Aprobado: 'success', Presentado: 'default', Finalizado: 'success',
}
const estadoVariant: Record<string, any> = {
  'Depósito Origen': 'secondary', 'Puerto Origen': 'default', 'En tránsito': 'warning',
  'Puerto Destino': 'default', 'Zona Primaria LR': 'orange', 'Depósito Fiscal': 'success',
}

const empty = {
  id_envio: '', detalle: '', shipper: '', consignee: '', nro_factura: '',
  valor_total_factura: '', moneda: 'USD', estado_documentacion: 'Pendiente',
  estado: 'Depósito Origen', destino_final: '', tipo_importacion: '', categoria: '',
}

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([])
  const [envios, setEnvios] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState<any>({ ...empty })
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')
  const [selectedEnvio, setSelectedEnvio] = useState<any | null>(null)

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkEstado, setBulkEstado] = useState('')
  const [bulkDoc, setBulkDoc] = useState('')
  const [bulkApplying, setBulkApplying] = useState(false)
  const [showBulkMenu, setShowBulkMenu] = useState(false)

  async function load() {
    const [ir, er] = await Promise.all([
      fetch('/api/items'),
      fetch('/api/envios?abiertos=1'),
    ])
    setItems(await ir.json())
    setEnvios(await er.json())
  }

  useEffect(() => { load() }, [])

  function openNew() { setForm({ ...empty }); setEditing(null); setSelectedEnvio(null); setOpen(true) }

  function openEdit(it: any) {
    setForm({ ...it, valor_total_factura: it.valor_total_factura ?? '' })
    setEditing(it)
    const envio = envios.find(e => e.id_envio === it.id_envio) || null
    setSelectedEnvio(envio)
    setOpen(true)
  }

  function set(k: string, v: string) {
    setForm((f: any) => ({ ...f, [k]: v }))
    if (k === 'id_envio') {
      const envio = envios.find(e => e.id_envio === v) || null
      setSelectedEnvio(envio)
    }
  }

  async function save() {
    setSaving(true)
    const body = { ...form, valor_total_factura: form.valor_total_factura ? Number(form.valor_total_factura) : null }
    if (editing) {
      await fetch(`/api/items/${editing.id_item}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false); setOpen(false); load()
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar este ítem?')) return
    await fetch(`/api/items/${id}`, { method: 'DELETE' }); load()
  }

  // ── Bulk actions ────────────────────────────────────────────────────────────
  const filtered = items.filter(i =>
    !filter || i.id_item?.includes(filter) || i.detalle?.toLowerCase().includes(filter.toLowerCase()) ||
    i.id_envio?.includes(filter)
  )

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(i => i.id_item)))
    }
  }

  function selectByEnvio(id_envio: string) {
    const ids = filtered.filter(i => i.id_envio === id_envio).map(i => i.id_item)
    setSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
    setShowBulkMenu(false)
  }

  async function applyBulk() {
    if (!selected.size) return
    if (!bulkEstado && !bulkDoc) return
    setBulkApplying(true)
    const body: any = { ids: Array.from(selected) }
    if (bulkEstado) body.estado = bulkEstado
    if (bulkDoc) body.estado_documentacion = bulkDoc
    await fetch('/api/items/bulk', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setBulkApplying(false)
    setSelected(new Set())
    setBulkEstado('')
    setBulkDoc('')
    load()
  }

  const allChecked = filtered.length > 0 && selected.size === filtered.length
  const someChecked = selected.size > 0 && selected.size < filtered.length

  // Unique envíos in current filtered list for "select by envío"
  const uniqueEnvios = Array.from(new Set(filtered.map(i => i.id_envio).filter(Boolean)))

  return (
    <div>
      <Topbar title="Ítems" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-5 gap-3 flex-wrap">
          <input
            placeholder="Buscar por ID, detalle o envío..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-72 focus:border-[#6B1A1A] focus:outline-none focus:ring-1 focus:ring-[#6B1A1A]"
          />
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <span className="text-sm text-gray-500">{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</span>
            )}
            <Button onClick={openNew}><Plus size={16} />Nuevo Ítem</Button>
          </div>
        </div>

        {/* ── Bulk action bar ─────────────────────────────────────────────── */}
        {selected.size > 0 && (
          <div className="mb-4 flex items-center gap-3 bg-[#F5EEEE] border border-red-100 rounded-xl px-4 py-3 flex-wrap">
            <span className="text-sm font-semibold text-[#4A1010]">{selected.size} ítem{selected.size !== 1 ? 's' : ''} seleccionado{selected.size !== 1 ? 's' : ''}</span>
            <div className="flex-1 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">Estado ítem:</span>
                <select
                  value={bulkEstado}
                  onChange={e => setBulkEstado(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#6B1A1A]"
                >
                  <option value="">Sin cambio</option>
                  {ESTADOS_ITEM.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">Estado doc.:</span>
                <select
                  value={bulkDoc}
                  onChange={e => setBulkDoc(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#6B1A1A]"
                >
                  <option value="">Sin cambio</option>
                  {ESTADOS_DOC.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={bulkApplying || (!bulkEstado && !bulkDoc)}
                onClick={applyBulk}
              >
                {bulkApplying ? 'Aplicando...' : 'Aplicar'}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setSelected(new Set()); setBulkEstado(''); setBulkDoc('') }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {/* Checkbox header */}
                  <th className="px-3 py-3 w-10">
                    <div className="relative">
                      <button
                        onClick={toggleAll}
                        className="text-gray-400 hover:text-[#6B1A1A] transition-colors"
                        title="Seleccionar todos"
                      >
                        {allChecked ? <CheckSquare size={16} className="text-[#6B1A1A]" /> : someChecked ? <CheckSquare size={16} className="text-[#6B1A1A] opacity-50" /> : <Square size={16} />}
                      </button>
                      {/* Select by envío dropdown */}
                      {uniqueEnvios.length > 0 && (
                        <button
                          onClick={() => setShowBulkMenu(v => !v)}
                          className="ml-0.5 text-gray-400 hover:text-[#6B1A1A]"
                        >
                          <ChevronDown size={12} />
                        </button>
                      )}
                      {showBulkMenu && (
                        <div className="absolute top-7 left-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
                          <p className="text-xs text-gray-400 px-3 py-1 font-semibold">Seleccionar por envío</p>
                          {uniqueEnvios.map(ev => (
                            <button
                              key={ev}
                              onClick={() => selectByEnvio(ev)}
                              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-[#F5EEEE] text-[#6B1A1A]"
                            >
                              {ev}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </th>
                  {['ID Ítem', 'Tipo Imp.', 'Categoría', 'Detalle', 'Envío', 'Shipper', 'Factura', 'Estado Doc.', 'Estado', 'ETA', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-12 text-gray-400">No hay ítems</td></tr>
                )}
                {filtered.map((it) => {
                  const isSelected = selected.has(it.id_item)
                  return (
                    <tr
                      key={it.id_item}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-[#FDF5F5]' : ''}`}
                    >
                      <td className="px-3 py-3">
                        <button onClick={() => toggleOne(it.id_item)} className="text-gray-400 hover:text-[#6B1A1A]">
                          {isSelected ? <CheckSquare size={16} className="text-[#6B1A1A]" /> : <Square size={16} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#6B1A1A]">{it.id_item}</td>
                      <td className="px-4 py-3">
                        {it.tipo_importacion
                          ? <Badge variant="default">{it.tipo_importacion}</Badge>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[140px] truncate" title={it.categoria}>{it.categoria ?? '—'}</td>
                      <td className="px-4 py-3">{it.detalle ?? '-'}</td>
                      <td className="px-4 py-3 text-[#6B1A1A]">{it.id_envio ?? '-'}</td>
                      <td className="px-4 py-3">{it.shipper ?? '-'}</td>
                      <td className="px-4 py-3">{it.nro_factura ?? '-'}</td>
                      <td className="px-4 py-3"><Badge variant={docVariant[it.estado_documentacion] ?? 'secondary'}>{it.estado_documentacion}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={estadoVariant[it.estado] ?? 'secondary'}>{it.estado}</Badge></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{it.envio_eta ?? it.eta ?? '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(it)}><Pencil size={15} /></Button>
                          <Button variant="ghost" size="icon" onClick={() => del(it.id_item)}><Trash2 size={15} className="text-red-500" /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Editar ${editing.id_item}` : 'Nuevo Ítem'} size="xl">
        <div className="grid grid-cols-2 gap-4">
          <DynamicSelect label="Tipo de Importación" tipo="tipo_importacion" value={form.tipo_importacion} onChange={v => set('tipo_importacion', v)} placeholder="Seleccionar..." />
          <DynamicSelect label="Categoría" tipo="categoria_item" value={form.categoria} onChange={v => set('categoria', v)} placeholder="Seleccionar..." />
          <Select
            label="Envío (solo activos)"
            options={envios.map(e => ({ value: e.id_envio, label: `${e.id_envio} — ${e.origen ?? ''} → ${e.destino ?? ''}` }))}
            placeholder="Seleccionar envío (opcional)..."
            value={form.id_envio}
            onChange={(e: any) => set('id_envio', e.target.value)}
          />
          <Input label="Detalle del Ítem" value={form.detalle} onChange={(e: any) => set('detalle', e.target.value)} placeholder="Descripción del producto" />
          <DynamicSelect label="Shipper" tipo="shipper" value={form.shipper} onChange={v => set('shipper', v)} placeholder="Seleccionar o agregar..." />
          <DynamicSelect label="Consignee" tipo="consignee" value={form.consignee} onChange={v => set('consignee', v)} placeholder="Seleccionar o agregar..." />
          <Input label="N° Factura" value={form.nro_factura} onChange={(e: any) => set('nro_factura', e.target.value)} />
          <div className="flex gap-2">
            <Input label="Valor Total Factura" type="number" step="0.01" value={form.valor_total_factura} onChange={(e: any) => set('valor_total_factura', e.target.value)} className="flex-1" />
            <Select label="Moneda" options={MONEDAS} value={form.moneda} onChange={(e: any) => set('moneda', e.target.value)} className="w-24" />
          </div>
          <Select label="Estado Documentación" options={ESTADOS_DOC} value={form.estado_documentacion} onChange={(e: any) => set('estado_documentacion', e.target.value)} />
          <Select label="Estado del Ítem" options={ESTADOS_ITEM} value={form.estado} onChange={(e: any) => set('estado', e.target.value)} />
          <Select label="Destino Final" options={DESTINOS_FINALES} placeholder="Seleccionar..." value={form.destino_final} onChange={(e: any) => set('destino_final', e.target.value)} />
          <div />

          {selectedEnvio && (
            <div className="col-span-2 bg-[#F5EEEE] border border-red-100 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-[#4A1010] mb-1">Fechas del envío (informativo — se sincronizan automáticamente)</p>
              <div className="flex gap-6 text-sm">
                <span><span className="text-gray-500">ETD:</span> <strong>{selectedEnvio.etd || '—'}</strong></span>
                <span><span className="text-gray-500">ETA:</span> <strong>{selectedEnvio.eta || '—'}</strong></span>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear Ítem'}</Button>
        </div>
      </Modal>
    </div>
  )
}
