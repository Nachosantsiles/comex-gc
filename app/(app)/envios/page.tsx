'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DynamicSelect } from '@/components/ui/dynamic-select'
import { InlineStatusBadge } from '@/components/ui/inline-status-badge'
import { Plus, Pencil, Trash2, Package, History, Lock, Unlock, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { MODALIDADES, INCOTERMS, GESTIONES, BL_TIPOS, ESTADOS_DOC, ESTADOS_ITEM, TIPO_IMP_CONFIG } from '@/lib/constants'
import { fmtDate } from '@/lib/utils'

const TIPOS_TRANSPORTE = ['Marítimo', 'Aéreo', 'Terrestre Internacional']

const emptyForm = {
  tipo_transporte: '', modalidad: '', nombre_agencia: '', ref_contenedor: '',
  origen: '', destino: '', incoterm: '', gestion: '', nombre_empresa: '',
  bl_awb_crt: '', bl_tipo: '', fecha_carga: '', etd: '', fecha_salida: '',
  eta: '', fecha_llegada_puerto: '', fecha_llegada_lr: '',
  fecha_desconsolidacion: '', observaciones: '', cerrado: false,
}

function getEtapa(e: any): { label: string; variant: any } {
  if (e.cerrado) return { label: 'Cerrado', variant: 'secondary' }
  if (e.fecha_desconsolidacion) return { label: 'Desconsolidado', variant: 'success' }
  if (e.fecha_llegada_lr) return { label: 'En La Rioja', variant: 'success' }
  if (e.fecha_llegada_puerto) return { label: 'Puerto Destino', variant: 'orange' }
  if (e.fecha_salida) return { label: 'En Tránsito', variant: 'warning' }
  if (e.fecha_carga) return { label: 'Cargado', variant: 'default' }
  if (e.etd) return { label: 'ETD Confirmado', variant: 'default' }
  return { label: 'Sin Iniciar', variant: 'secondary' }
}

const TIPO_ICON: Record<string, string> = {
  'Marítimo': '🚢', 'Aéreo': '✈️', 'Terrestre Internacional': '🚛',
}

const docVariant: Record<string, any> = {
  Pendiente: 'secondary', 'En Preparación': 'default', 'En Revisión': 'warning',
  Observado: 'danger', Corregido: 'orange', Aprobado: 'success', Presentado: 'default', Finalizado: 'success',
}
const estadoVariant: Record<string, any> = {
  'Depósito Origen': 'secondary', 'Puerto Origen': 'default', 'En tránsito': 'warning',
  'Puerto Destino': 'default', 'Zona Primaria LR': 'orange', 'Depósito Fiscal': 'success',
}

// InlineStatusBadge → now using shared InlineStatusBadge with portal from @/components/ui/inline-status-badge

// ── Expanded items panel ────────────────────────────────────────────────────
function ItemsPanel({ idEnvio }: { idEnvio: string }) {
  const [items, setItems] = useState<any[] | null>(null)

  useEffect(() => {
    fetch(`/api/items?id_envio=${encodeURIComponent(idEnvio)}`)
      .then(r => r.json())
      .then(setItems)
  }, [idEnvio])

  const patchItem = useCallback(async (id: string, fields: Record<string, string>) => {
    await fetch(`/api/items/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
    })
    setItems(prev => prev ? prev.map(it => it.id_item === id ? { ...it, ...fields } : it) : prev)
  }, [])

  if (!items) {
    return (
      <tr>
        <td colSpan={10} className="px-6 py-4 bg-[#F9F6F0] border-b border-amber-100">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="animate-spin w-3 h-3 border-2 border-gray-300 border-t-[#6B1A1A] rounded-full" />
            Cargando ítems...
          </div>
        </td>
      </tr>
    )
  }

  if (items.length === 0) {
    return (
      <tr>
        <td colSpan={10} className="px-6 py-5 bg-[#F9F6F0] border-b border-amber-100">
          <p className="text-sm text-gray-400 text-center">Sin ítems asociados a este envío</p>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td colSpan={10} className="bg-[#F9F6F0] border-b border-amber-100 px-0 py-0">
        <div className="px-8 py-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Package size={13} className="text-[#6B1A1A]" />
            <span className="text-xs font-semibold text-[#6B1A1A] uppercase tracking-wider">
              {items.length} ítem{items.length !== 1 ? 's' : ''} en este envío
            </span>
          </div>
          {/* Mini table */}
          <div className="rounded-xl overflow-hidden border border-amber-100 bg-white shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-amber-50/60 border-b border-amber-100">
                  {['ID Ítem', 'Tipo', 'Detalle', 'Shipper', 'Consignee', 'Factura', 'Valor', 'Estado Doc.', 'Estado', 'Destino'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={it.id_item} className={`border-b border-amber-50 hover:bg-amber-50/40 transition-colors ${i === items.length - 1 ? 'border-0' : ''}`}>
                    <td className="px-3 py-2 font-semibold text-[#6B1A1A] whitespace-nowrap">{it.id_item}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {(() => { const cfg = TIPO_IMP_CONFIG[it.tipo_importacion]; return cfg
                        ? <Badge variant={cfg.variant as any} title={cfg.title}>{cfg.label}</Badge>
                        : <span className="text-gray-300">—</span> })()}
                    </td>
                    <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate" title={it.detalle}>{it.detalle ?? '-'}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{it.shipper ?? '-'}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{it.consignee ?? '-'}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap font-mono">{it.nro_factura ?? '-'}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {it.valor_total_factura
                        ? `${it.moneda ?? 'USD'} ${Number(it.valor_total_factura).toLocaleString()}`
                        : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <InlineStatusBadge
                        value={it.estado_documentacion ?? 'Pendiente'}
                        options={ESTADOS_DOC}
                        variant={docVariant}
                        onSave={v => patchItem(it.id_item, { estado_documentacion: v })}
                        stopPropagation
                      />
                    </td>
                    <td className="px-3 py-2">
                      <InlineStatusBadge
                        value={it.estado ?? 'Depósito Origen'}
                        options={ESTADOS_ITEM}
                        variant={estadoVariant}
                        onSave={v => patchItem(it.id_item, { estado: v })}
                        stopPropagation
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{it.destino_final ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </td>
    </tr>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function EnviosPage() {
  const [envios, setEnvios] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState<any>({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [historialModal, setHistorialModal] = useState(false)
  const [historial, setHistorial] = useState<any[]>([])
  const [historialEnvio, setHistorialEnvio] = useState('')
  const [motivoModal, setMotivoModal] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [pendingSave, setPendingSave] = useState<any | null>(null)
  const [originalDates, setOriginalDates] = useState({ etd: '', eta: '' })
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<'todos' | 'activos' | 'cerrados'>('todos')
  const [expandedEnvio, setExpandedEnvio] = useState<string | null>(null)

  async function load() {
    const r = await fetch('/api/envios')
    setEnvios(await r.json())
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ ...emptyForm }); setEditing(null)
    setOriginalDates({ etd: '', eta: '' }); setOpen(true)
  }

  function openEdit(e: any) {
    setForm({ ...e, cerrado: !!e.cerrado }); setEditing(e)
    setOriginalDates({ etd: e.etd ?? '', eta: e.eta ?? '' }); setOpen(true)
  }

  function set(key: string, val: any) { setForm((f: any) => ({ ...f, [key]: val })) }

  async function save() {
    if (editing) {
      const etdChanged = form.etd !== originalDates.etd
      const etaChanged = form.eta !== originalDates.eta
      if (etdChanged || etaChanged) {
        setPendingSave({ ...form }); setMotivo(''); setMotivoModal(true); return
      }
    }
    await doSave(form, '')
  }

  async function doSave(data: any, motivoCambio: string) {
    setSaving(true)
    const body = { ...data, motivo_cambio_fecha: motivoCambio }
    if (editing) {
      await fetch(`/api/envios/${editing.id_envio}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/envios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false); setOpen(false); setMotivoModal(false); setPendingSave(null); load()
  }

  async function confirmMotivo() {
    if (pendingSave) await doSave(pendingSave, motivo)
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar este envío?')) return
    await fetch(`/api/envios/${id}`, { method: 'DELETE' })
    if (expandedEnvio === id) setExpandedEnvio(null)
    load()
  }

  async function openHistorial(e: any) {
    const r = await fetch(`/api/historial/${e.id_envio}`)
    setHistorial(await r.json()); setHistorialEnvio(e.id_envio); setHistorialModal(true)
  }

  async function toggleCerrado(e: any) {
    await fetch(`/api/envios/${e.id_envio}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...e, cerrado: e.cerrado ? 0 : 1 }),
    }); load()
  }

  function toggleExpand(id: string) {
    setExpandedEnvio(prev => prev === id ? null : id)
  }

  const filtered = envios.filter(e => {
    const matchesSearch = !search ||
      e.id_envio?.toLowerCase().includes(search.toLowerCase()) ||
      e.nombre_agencia?.toLowerCase().includes(search.toLowerCase()) ||
      e.origen?.toLowerCase().includes(search.toLowerCase()) ||
      e.destino?.toLowerCase().includes(search.toLowerCase()) ||
      e.ref_contenedor?.toLowerCase().includes(search.toLowerCase())
    const matchesEstado =
      filterEstado === 'todos' ? true :
      filterEstado === 'activos' ? !e.cerrado :
      !!e.cerrado
    return matchesSearch && matchesEstado
  })

  const totalActivos = envios.filter(e => !e.cerrado).length
  const totalCerrados = envios.filter(e => e.cerrado).length

  return (
    <div>
      <Topbar title="Envíos" />
      <div className="p-6">

        {/* ── Search + filter bar ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar envío, agencia, origen..."
                className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 w-64 focus:border-[#6B1A1A] focus:outline-none focus:ring-1 focus:ring-[#6B1A1A]"
              />
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {[
                { key: 'todos', label: `Todos (${envios.length})` },
                { key: 'activos', label: `Activos (${totalActivos})` },
                { key: 'cerrados', label: `Cerrados (${totalCerrados})` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterEstado(key as any)}
                  className={`px-3 py-1.5 transition-colors ${
                    filterEstado === key
                      ? 'bg-[#6B1A1A] text-white font-medium'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={openNew}><Plus size={16} />Nuevo Envío</Button>
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-3 py-3 w-8" /> {/* expand chevron col */}
                  {['ID Envío', 'Tipo', 'Agencia/Línea', 'Origen → Destino', 'Ref. Contenedor', 'ETD', 'ETA', 'Etapa', 'Ítems', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-gray-400">
                      {search || filterEstado !== 'todos' ? 'No se encontraron envíos con ese filtro' : 'No hay envíos registrados'}
                    </td>
                  </tr>
                )}
                {filtered.map((e) => {
                  const etapa = getEtapa(e)
                  const isExpanded = expandedEnvio === e.id_envio
                  return (
                    <>
                      <tr
                        key={e.id_envio}
                        onClick={() => toggleExpand(e.id_envio)}
                        className={`border-b border-gray-50 transition-colors cursor-pointer select-none
                          ${e.cerrado ? 'opacity-55' : ''}
                          ${isExpanded ? 'bg-amber-50/50 border-amber-100' : 'hover:bg-gray-50/80'}`}
                      >
                        {/* Expand chevron */}
                        <td className="px-3 py-3.5 w-8">
                          <span className={`text-gray-400 transition-transform duration-200 inline-block ${isExpanded ? 'rotate-90' : ''}`}>
                            <ChevronRight size={15} />
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-[#6B1A1A]">{e.id_envio}</td>
                        <td className="px-4 py-3.5 text-gray-700">
                          <span className="mr-1">{TIPO_ICON[e.tipo_transporte] ?? '📦'}</span>
                          {e.tipo_transporte ?? '-'}
                        </td>
                        <td className="px-4 py-3.5 text-gray-700">{e.nombre_agencia ?? '-'}</td>
                        <td className="px-4 py-3.5 text-gray-700">
                          <span className="text-gray-500">{e.origen ?? '-'}</span>
                          <span className="mx-1 text-gray-300">→</span>
                          <span className="font-medium">{e.destino ?? '-'}</span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-500 font-mono">{e.ref_contenedor ?? '-'}</td>
                        <td className="px-4 py-3.5 text-xs text-gray-500">{fmtDate(e.etd)}</td>
                        <td className="px-4 py-3.5 text-xs text-gray-500">{fmtDate(e.eta)}</td>
                        <td className="px-4 py-3.5">
                          <Badge variant={etapa.variant}>{etapa.label}</Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="default" className="gap-1">
                            <Package size={11} />{e.total_items ?? 0}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5" onClick={ev => ev.stopPropagation()}>
                          <div className="flex gap-1 items-center">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(e)} title="Editar"><Pencil size={14} /></Button>
                            <Button variant="ghost" size="icon" onClick={() => openHistorial(e)} title="Historial ETD/ETA"><History size={14} /></Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => toggleCerrado(e)}
                              title={e.cerrado ? 'Reabrir envío' : 'Cerrar envío'}
                            >
                              {e.cerrado
                                ? <Unlock size={14} className="text-green-600" />
                                : <Lock size={14} className="text-gray-400" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => del(e.id_envio)}>
                              <Trash2 size={14} className="text-red-400" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {/* ── Expanded items panel ── */}
                      {isExpanded && <ItemsPanel key={`items-${e.id_envio}`} idEnvio={e.id_envio} />}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── Modal editar/nuevo ───────────────────────────────────────────── */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Editar ${editing.id_envio}` : 'Nuevo Envío'} size="2xl">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Tipo de Transporte" options={TIPOS_TRANSPORTE} placeholder="Seleccionar..." value={form.tipo_transporte} onChange={(e: any) => set('tipo_transporte', e.target.value)} />
          <Select label="Modalidad" options={MODALIDADES} placeholder="Seleccionar..." value={form.modalidad} onChange={(e: any) => set('modalidad', e.target.value)} />
          <DynamicSelect label="Agencia / Línea Naviera" tipo="agencia" value={form.nombre_agencia} onChange={v => set('nombre_agencia', v)} placeholder="Seleccionar o agregar..." />
          <DynamicSelect label="Empresa (Forwarder)" tipo="empresa" value={form.nombre_empresa} onChange={v => set('nombre_empresa', v)} placeholder="Seleccionar o agregar..." />
          <Input label="Ref. Contenedor / Carga" value={form.ref_contenedor} onChange={(e: any) => set('ref_contenedor', e.target.value)} />
          <Select label="Tipo BL/AWB/CRT" options={BL_TIPOS} placeholder="Seleccionar..." value={form.bl_tipo} onChange={(e: any) => set('bl_tipo', e.target.value)} />
          <Input label="Nro. BL / AWB / CRT" value={form.bl_awb_crt} onChange={(e: any) => set('bl_awb_crt', e.target.value)} />
          <Select label="Incoterm" options={INCOTERMS} placeholder="Seleccionar..." value={form.incoterm} onChange={(e: any) => set('incoterm', e.target.value)} />
          <DynamicSelect label="Origen" tipo="origen" value={form.origen} onChange={v => set('origen', v)} placeholder="Seleccionar o agregar..." />
          <DynamicSelect label="Destino" tipo="destino" value={form.destino} onChange={v => set('destino', v)} placeholder="Seleccionar o agregar..." />
          <Select label="Gestión" options={GESTIONES} placeholder="Seleccionar..." value={form.gestion} onChange={(e: any) => set('gestion', e.target.value)} />
          <div />

          <div className="col-span-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 pb-1 border-b">Fechas de tránsito</p>
            <div className="grid grid-cols-3 gap-4">
              <Input label="ETD" type="date" value={form.etd} onChange={(e: any) => set('etd', e.target.value)} />
              <Input label="ETA" type="date" value={form.eta} onChange={(e: any) => set('eta', e.target.value)} />
              <Input label="Fecha de Carga" type="date" value={form.fecha_carga} onChange={(e: any) => set('fecha_carga', e.target.value)} />
              <Input label="Fecha de Salida" type="date" value={form.fecha_salida} onChange={(e: any) => set('fecha_salida', e.target.value)} />
              <Input label="Llegada a Puerto" type="date" value={form.fecha_llegada_puerto} onChange={(e: any) => set('fecha_llegada_puerto', e.target.value)} />
              <Input label="Llegada a La Rioja" type="date" value={form.fecha_llegada_lr} onChange={(e: any) => set('fecha_llegada_lr', e.target.value)} />
              <Input label="Desconsolidación" type="date" value={form.fecha_desconsolidacion} onChange={(e: any) => set('fecha_desconsolidacion', e.target.value)} />
            </div>
            {editing && (form.etd !== originalDates.etd || form.eta !== originalDates.eta) && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
                Se registrará el cambio de ETD/ETA al guardar. Se pedirá motivo.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 col-span-2">
            <input type="checkbox" id="cerrado" checked={!!form.cerrado} onChange={e => set('cerrado', e.target.checked)} className="rounded" />
            <label htmlFor="cerrado" className="text-sm font-medium text-gray-700">Envío cerrado (no aparece en selects)</label>
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium text-gray-700">Observaciones</label>
            <textarea className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6B1A1A] focus:outline-none focus:ring-1 focus:ring-[#6B1A1A] resize-none" rows={2} value={form.observaciones} onChange={(e: any) => set('observaciones', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear Envío'}</Button>
        </div>
      </Modal>

      {/* ── Modal motivo cambio fecha ────────────────────────────────────── */}
      <Modal open={motivoModal} onClose={() => setMotivoModal(false)} title="Motivo de cambio de fecha" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {pendingSave?.etd !== originalDates.etd && <span className="block">ETD: <strong>{originalDates.etd || 'sin fecha'}</strong> → <strong>{pendingSave?.etd || 'sin fecha'}</strong></span>}
            {pendingSave?.eta !== originalDates.eta && <span className="block">ETA: <strong>{originalDates.eta || 'sin fecha'}</strong> → <strong>{pendingSave?.eta || 'sin fecha'}</strong></span>}
          </p>
          <div>
            <label className="text-sm font-medium text-gray-700">Motivo del cambio</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6B1A1A] focus:outline-none focus:ring-1 focus:ring-[#6B1A1A] resize-none"
              rows={3} placeholder="Ej: Demora en puerto de origen, cambio de buque..."
              value={motivo} onChange={e => setMotivo(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={() => setMotivoModal(false)}>Cancelar</Button>
          <Button onClick={confirmMotivo} disabled={saving}>{saving ? 'Guardando...' : 'Confirmar cambio'}</Button>
        </div>
      </Modal>

      {/* ── Modal historial ETD/ETA ──────────────────────────────────────── */}
      <Modal open={historialModal} onClose={() => setHistorialModal(false)} title={`Historial de fechas — ${historialEnvio}`} size="lg">
        {historial.length === 0
          ? <p className="text-sm text-gray-400 text-center py-8">Sin cambios registrados</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Fecha cambio', 'Campo', 'Anterior', 'Nuevo', 'Motivo', 'Usuario'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h: any) => (
                    <tr key={h.id} className="border-b border-gray-50">
                      <td className="px-3 py-2 text-gray-500">{fmtDate(h.created_at)}</td>
                      <td className="px-3 py-2 font-medium">{h.campo}</td>
                      <td className="px-3 py-2 text-red-600">{h.valor_anterior || '-'}</td>
                      <td className="px-3 py-2 text-green-600">{h.valor_nuevo || '-'}</td>
                      <td className="px-3 py-2">{h.motivo || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{h.usuario || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={() => setHistorialModal(false)}>Cerrar</Button>
        </div>
      </Modal>
    </div>
  )
}
