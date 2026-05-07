'use client'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { ESTADOS_DESPACHO, CANALES } from '@/lib/constants'

const estadoVariant: Record<string, any> = { 'En curso': 'default', 'Observado': 'danger', 'Liberado': 'success' }
const canalVariant: Record<string, any> = { Verde: 'success', Naranja: 'orange', Rojo: 'danger' }

const empty = {
  id_despacho: '', id_envio: '', turno_retiro: '', estado: 'En curso', canal: '',
  motivo_demora: '', fecha_oficializacion: '', fecha_liberacion: '',
  fecha_desconsolidacion: '', nombre_despachante: '', honorarios_pesos: '',
  tipo_cambio: '', honorarios_usd: '', gastos_extras_usd: '', items: [] as string[],
}

export default function AduanaPage() {
  const [despachos, setDespachos] = useState<any[]>([])
  const [envios, setEnvios] = useState<any[]>([])
  const [allItems, setAllItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState({ ...empty })
  const [saving, setSaving] = useState(false)

  async function load() {
    const [dr, er, ir] = await Promise.all([
      fetch('/api/despachos'),
      fetch('/api/envios?abiertos=1'),
      fetch('/api/items'),
    ])
    setDespachos(await dr.json())
    setEnvios(await er.json())
    setAllItems(await ir.json())
  }

  useEffect(() => { load() }, [])

  function openNew() { setForm({ ...empty, items: [] }); setEditing(null); setOpen(true) }

  async function openEdit(d: any) {
    const r = await fetch(`/api/despachos/${d.id_despacho}`)
    const full = await r.json()
    setForm({
      ...full,
      honorarios_pesos: full.honorarios_pesos ?? '',
      tipo_cambio: full.tipo_cambio ?? '',
      honorarios_usd: full.honorarios_usd ?? '',
      gastos_extras_usd: full.gastos_extras_usd ?? '',
    })
    setEditing(d); setOpen(true)
  }

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  function toggleItem(id_item: string) {
    setForm(f => ({
      ...f,
      items: f.items.includes(id_item) ? f.items.filter(i => i !== id_item) : [...f.items, id_item],
    }))
  }

  async function save() {
    setSaving(true)
    const body = {
      ...form,
      honorarios_pesos: form.honorarios_pesos ? Number(form.honorarios_pesos) : null,
      tipo_cambio: form.tipo_cambio ? Number(form.tipo_cambio) : null,
      honorarios_usd: form.honorarios_usd ? Number(form.honorarios_usd) : null,
      gastos_extras_usd: form.gastos_extras_usd ? Number(form.gastos_extras_usd) : null,
    }
    if (editing) {
      await fetch(`/api/despachos/${editing.id_despacho}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/despachos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false); setOpen(false); load()
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar este despacho?')) return
    await fetch(`/api/despachos/${id}`, { method: 'DELETE' }); load()
  }

  const itemsForEnvio = form.id_envio ? allItems.filter(i => i.id_envio === form.id_envio) : allItems

  return (
    <div>
      <Topbar title="Aduana" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-5">
          <p className="text-sm text-gray-500">{despachos.length} despacho{despachos.length !== 1 ? 's' : ''}</p>
          <Button onClick={openNew}><Plus size={16} />Nuevo Despacho</Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['ID Despacho', 'Envío', 'Ítems', 'Estado', 'Canal', 'Oficialización', 'Liberación', 'Despachante', 'Honorarios USD', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {despachos.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-12 text-gray-400">No hay despachos registrados</td></tr>
                )}
                {despachos.map((d) => (
                  <tr key={d.id_despacho} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{d.id_despacho}</td>
                    <td className="px-4 py-3 text-[#6B1A1A]">{d.id_envio ?? '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{d.items_str ?? '-'}</td>
                    <td className="px-4 py-3"><Badge variant={estadoVariant[d.estado] ?? 'secondary'}>{d.estado}</Badge></td>
                    <td className="px-4 py-3">{d.canal ? <Badge variant={canalVariant[d.canal] ?? 'secondary'}>{d.canal}</Badge> : '-'}</td>
                    <td className="px-4 py-3">{d.fecha_oficializacion ?? '-'}</td>
                    <td className="px-4 py-3">{d.fecha_liberacion ?? '-'}</td>
                    <td className="px-4 py-3">{d.nombre_despachante ?? '-'}</td>
                    <td className="px-4 py-3">{d.honorarios_usd != null ? `USD ${d.honorarios_usd}` : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(d)}><Pencil size={15} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => del(d.id_despacho)}><Trash2 size={15} className="text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Editar Despacho ${editing.id_despacho}` : 'Nuevo Despacho'} size="2xl">
        <div className="grid grid-cols-2 gap-4">
          <Input label="ID Despacho (asignado por Aduana)" value={form.id_despacho} onChange={e => set('id_despacho', e.target.value)} placeholder="Ej: 26-2025-00123" disabled={!!editing} />
          <Select
            label="Envío (solo activos)"
            options={envios.map(e => ({ value: e.id_envio, label: e.id_envio }))}
            placeholder="Seleccionar envío..."
            value={form.id_envio}
            onChange={e => set('id_envio', e.target.value)}
          />
          <Select label="Estado del Despacho" options={ESTADOS_DESPACHO} value={form.estado} onChange={e => set('estado', e.target.value)} />
          <Select label="Canal" options={CANALES} placeholder="Sin asignar" value={form.canal} onChange={e => set('canal', e.target.value)} />
          <Input label="Turno de Retiro (Fecha/Hora)" value={form.turno_retiro} onChange={e => set('turno_retiro', e.target.value)} placeholder="DD/MM/YYYY HH:MM" />
          <Input label="Nombre Despachante" value={form.nombre_despachante} onChange={e => set('nombre_despachante', e.target.value)} />
          <Input label="Fecha de Oficialización" type="date" value={form.fecha_oficializacion} onChange={e => set('fecha_oficializacion', e.target.value)} />
          <Input label="Fecha de Liberación" type="date" value={form.fecha_liberacion} onChange={e => set('fecha_liberacion', e.target.value)} />
          <Input label="Fecha Desconsolidación" type="date" value={form.fecha_desconsolidacion} onChange={e => set('fecha_desconsolidacion', e.target.value)} />
          <Input label="Honorarios ($ARS)" type="number" value={form.honorarios_pesos} onChange={e => set('honorarios_pesos', e.target.value)} />
          <Input label="Tipo de Cambio" type="number" step="0.01" value={form.tipo_cambio} onChange={e => set('tipo_cambio', e.target.value)} />
          <Input label="Honorarios (USD)" type="number" step="0.01" value={form.honorarios_usd} onChange={e => set('honorarios_usd', e.target.value)} />
          <Input label="Gastos Extras (USD)" type="number" step="0.01" value={form.gastos_extras_usd} onChange={e => set('gastos_extras_usd', e.target.value)} />
          <div className="col-span-2">
            <Input label="Motivo de Demora" value={form.motivo_demora} onChange={e => set('motivo_demora', e.target.value)} placeholder="Opcional" />
          </div>

          <div className="col-span-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Ítems asociados a este despacho</p>
            <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
              {itemsForEnvio.length === 0 && <p className="text-xs text-gray-400">Seleccioná primero un envío</p>}
              {itemsForEnvio.map((it: any) => (
                <label key={it.id_item} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.items.includes(it.id_item)} onChange={() => toggleItem(it.id_item)} className="rounded" />
                  <span className="text-sm">{it.id_item} — {it.detalle ?? ''}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.id_despacho}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear Despacho'}</Button>
        </div>
      </Modal>
    </div>
  )
}
