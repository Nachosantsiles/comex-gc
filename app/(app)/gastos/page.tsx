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
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { fmtUSD, fmt } from '@/lib/utils'

const emptyForm: any = {
  id_envio: '', nombre_agencia: '', id_tipo_contenedor: '',
  peso_total_kg: '', volumen_total_m3: '',
  gastos_origen_usd: '', flete_internacional_usd: '',
  gastos_destino_usd: '', nombre_terminal: '', flete_interno_usd: '',
  criterio_distribucion: 'volumen',
  recargos: [] as any[],
  items_proporcionales: [] as any[],
}

export default function GastosPage() {
  const [gastos, setGastos] = useState<any[]>([])
  const [envios, setEnvios] = useState<any[]>([])
  const [containers, setContainers] = useState<any[]>([])
  const [allItems, setAllItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState<any>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  async function load() {
    const [gr, er, cr, ir] = await Promise.all([
      fetch('/api/gastos'), fetch('/api/envios?abiertos=1'), fetch('/api/containers'), fetch('/api/items'),
    ])
    setGastos(await gr.json())
    setEnvios(await er.json())
    setContainers(await cr.json())
    setAllItems(await ir.json())
  }
  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ ...emptyForm, criterio_distribucion: 'volumen', recargos: [], items_proporcionales: [] })
    setEditing(null)
    setOpen(true)
  }

  async function openEdit(g: any) {
    const r = await fetch(`/api/gastos/${g.id_gasto}`)
    const full = await r.json()
    setForm({
      ...full,
      peso_total_kg: full.peso_total_kg ?? '',
      volumen_total_m3: full.volumen_total_m3 ?? '',
      gastos_origen_usd: full.gastos_origen_usd ?? '',
      flete_internacional_usd: full.flete_internacional_usd ?? '',
      gastos_destino_usd: full.gastos_destino_usd ?? '',
      flete_interno_usd: full.flete_interno_usd ?? '',
      criterio_distribucion: full.criterio_distribucion ?? 'volumen',
      recargos: full.recargos ?? [],
      items_proporcionales: full.proporcionales?.map((p: any) => ({
        id_item: p.id_item, detalle: p.detalle,
        volumen_item_m3: p.volumen_item_m3 ?? '', peso_item_kg: p.peso_item_kg ?? '',
      })) ?? [],
    })
    setEditing(g)
    setOpen(true)
  }

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })) }

  function addRecargo() { set('recargos', [...form.recargos, { detalle: '', recargo_usd: '' }]) }
  function setRecargo(i: number, k: string, v: string) {
    setForm((f: any) => ({ ...f, recargos: f.recargos.map((r: any, idx: number) => idx === i ? { ...r, [k]: v } : r) }))
  }
  function removeRecargo(i: number) { set('recargos', form.recargos.filter((_: any, idx: number) => idx !== i)) }

  function toggleItem(it: any) {
    setForm((f: any) => {
      const exists = f.items_proporcionales.find((p: any) => p.id_item === it.id_item)
      if (exists) return { ...f, items_proporcionales: f.items_proporcionales.filter((p: any) => p.id_item !== it.id_item) }
      return { ...f, items_proporcionales: [...f.items_proporcionales, { id_item: it.id_item, detalle: it.detalle, volumen_item_m3: '', peso_item_kg: '' }] }
    })
  }

  function setProp(id_item: string, k: string, v: string) {
    setForm((f: any) => ({
      ...f,
      items_proporcionales: f.items_proporcionales.map((p: any) => p.id_item === id_item ? { ...p, [k]: v } : p),
    }))
  }

  const selectedContainer = containers.find(c => c.id === form.id_tipo_contenedor)
  const pesoTotal = form.items_proporcionales.reduce((a: number, p: any) => a + (parseFloat(p.peso_item_kg) || 0), 0)
  const volTotal = form.items_proporcionales.reduce((a: number, p: any) => a + (parseFloat(p.volumen_item_m3) || 0), 0)
  const pesoExcedido = selectedContainer && pesoTotal > selectedContainer.peso_max_kg

  // Preview proportional assignment
  const totalGasto =
    (parseFloat(form.gastos_origen_usd) || 0) + (parseFloat(form.flete_internacional_usd) || 0) +
    (parseFloat(form.gastos_destino_usd) || 0) + (parseFloat(form.flete_interno_usd) || 0) +
    form.recargos.reduce((a: number, r: any) => a + (parseFloat(r.recargo_usd) || 0), 0)

  function calcProporcional(it: any): number {
    if (form.criterio_distribucion === 'peso') {
      return pesoTotal > 0 ? ((parseFloat(it.peso_item_kg) || 0) / pesoTotal) * totalGasto : 0
    }
    return volTotal > 0 ? ((parseFloat(it.volumen_item_m3) || 0) / volTotal) * totalGasto : 0
  }

  async function save() {
    setSaving(true)
    const body = {
      ...form,
      peso_total_kg: form.peso_total_kg ? Number(form.peso_total_kg) : null,
      volumen_total_m3: form.volumen_total_m3 ? Number(form.volumen_total_m3) : null,
      gastos_origen_usd: form.gastos_origen_usd ? Number(form.gastos_origen_usd) : 0,
      flete_internacional_usd: form.flete_internacional_usd ? Number(form.flete_internacional_usd) : 0,
      gastos_destino_usd: form.gastos_destino_usd ? Number(form.gastos_destino_usd) : 0,
      flete_interno_usd: form.flete_interno_usd ? Number(form.flete_interno_usd) : 0,
      recargos: form.recargos.map((r: any) => ({ ...r, recargo_usd: Number(r.recargo_usd) || 0 })),
      items_proporcionales: form.items_proporcionales.map((p: any) => ({
        id_item: p.id_item,
        volumen_item_m3: Number(p.volumen_item_m3) || 0,
        peso_item_kg: Number(p.peso_item_kg) || 0,
      })),
    }
    if (editing) {
      await fetch(`/api/gastos/${editing.id_gasto}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/gastos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setSaving(false); setOpen(false); load()
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar estos gastos?')) return
    await fetch(`/api/gastos/${id}`, { method: 'DELETE' }); load()
  }

  const itemsForEnvio = form.id_envio ? allItems.filter(i => i.id_envio === form.id_envio) : []

  return (
    <div>
      <Topbar title="Gastos Logísticos" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-5">
          <p className="text-sm text-gray-500">{gastos.length} registro{gastos.length !== 1 ? 's' : ''}</p>
          <Button onClick={openNew}><Plus size={16} />Nuevo Gasto</Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['ID Gasto', 'Envío', 'Contenedor', 'Peso (kg)', 'Vol. (m³)', 'Criterio', 'Flete Int.', 'Total USD', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gastos.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">No hay gastos registrados</td></tr>
                )}
                {gastos.map((g) => {
                  const excede = g.peso_max_kg && g.peso_total_kg > g.peso_max_kg
                  return (
                    <tr key={g.id_gasto} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-700">{g.id_gasto}</td>
                      <td className="px-4 py-3 text-[#6B1A1A]">{g.id_envio ?? '-'}</td>
                      <td className="px-4 py-3">{g.id_tipo_contenedor ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span className={excede ? 'text-red-600 font-semibold' : ''}>{fmt(g.peso_total_kg, 0)}</span>
                        {excede && <AlertTriangle size={14} className="inline ml-1 text-red-500" />}
                      </td>
                      <td className="px-4 py-3">{fmt(g.volumen_total_m3, 2)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={g.criterio_distribucion === 'peso' ? 'warning' : 'default'}>
                          {g.criterio_distribucion === 'peso' ? 'Por peso' : 'Por volumen'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{fmtUSD(g.flete_internacional_usd)}</td>
                      <td className="px-4 py-3 font-semibold">{fmtUSD(g.total_usd)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(g)}><Pencil size={15} /></Button>
                          <Button variant="ghost" size="icon" onClick={() => del(g.id_gasto)}><Trash2 size={15} className="text-red-500" /></Button>
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Editar ${editing.id_gasto}` : 'Nuevos Gastos Logísticos'} size="2xl">
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">

          <section>
            <p className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Identificación</p>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Envío (solo activos)" options={envios.map(e => ({ value: e.id_envio, label: e.id_envio }))} placeholder="Seleccionar..." value={form.id_envio} onChange={(e: any) => set('id_envio', e.target.value)} />
              <Input label="Agencia / Línea" value={form.nombre_agencia} onChange={(e: any) => set('nombre_agencia', e.target.value)} />
              <Select label="Tipo de Contenedor" options={containers.map(c => ({ value: c.id, label: `${c.nombre} (max ${fmt(c.peso_max_kg, 0)} kg / ${c.volumen_max_m3} m³)` }))} placeholder="Seleccionar..." value={form.id_tipo_contenedor} onChange={(e: any) => set('id_tipo_contenedor', e.target.value)} />
              <DynamicSelect label="Terminal" tipo="terminal" value={form.nombre_terminal} onChange={v => set('nombre_terminal', v)} placeholder="Seleccionar o agregar..." />
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Gastos (USD)</p>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Gastos Origen" type="number" step="0.01" value={form.gastos_origen_usd} onChange={(e: any) => set('gastos_origen_usd', e.target.value)} />
              <Input label="Flete Internacional" type="number" step="0.01" value={form.flete_internacional_usd} onChange={(e: any) => set('flete_internacional_usd', e.target.value)} />
              <Input label="Gastos Destino" type="number" step="0.01" value={form.gastos_destino_usd} onChange={(e: any) => set('gastos_destino_usd', e.target.value)} />
              <Input label="Flete Interno" type="number" step="0.01" value={form.flete_interno_usd} onChange={(e: any) => set('flete_interno_usd', e.target.value)} />
              {totalGasto > 0 && (
                <div className="col-span-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-500">Subtotal gastos:</span> <strong>{fmtUSD(totalGasto)}</strong>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3 pb-1 border-b">
              <p className="text-sm font-semibold text-gray-700">Recargos adicionales</p>
              <Button variant="outline" size="sm" onClick={addRecargo}><Plus size={14} />Agregar</Button>
            </div>
            {form.recargos.map((r: any, i: number) => (
              <div key={i} className="grid grid-cols-[1fr_160px_36px] gap-2 mb-2 items-end">
                <Input label={i === 0 ? 'Detalle' : ''} value={r.detalle} onChange={(e: any) => setRecargo(i, 'detalle', e.target.value)} placeholder="Descripción" />
                <Input label={i === 0 ? 'Recargo USD' : ''} type="number" step="0.01" value={r.recargo_usd} onChange={(e: any) => setRecargo(i, 'recargo_usd', e.target.value)} />
                <button type="button" onClick={() => removeRecargo(i)} className="p-2 rounded-lg text-red-400 hover:bg-[#F5EEEE] mb-0.5"><Trash2 size={14} /></button>
              </div>
            ))}
          </section>

          <section>
            <div className="flex items-center justify-between mb-3 pb-1 border-b">
              <p className="text-sm font-semibold text-gray-700">Distribución por ítems</p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Criterio:</span>
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" checked={form.criterio_distribucion === 'volumen'} onChange={() => set('criterio_distribucion', 'volumen')} /> Por volumen (m³)
                </label>
                <label className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" checked={form.criterio_distribucion === 'peso'} onChange={() => set('criterio_distribucion', 'peso')} /> Por peso (kg)
                </label>
              </div>
            </div>

            {pesoExcedido && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                <AlertTriangle size={16} className="text-red-500" />
                <p className="text-sm text-red-700">Peso total ({fmt(pesoTotal, 0)} kg) supera el límite del contenedor ({fmt(selectedContainer?.peso_max_kg, 0)} kg)</p>
              </div>
            )}

            <div className="border border-gray-200 rounded-lg p-3 max-h-52 overflow-y-auto space-y-2">
              {itemsForEnvio.length === 0 && <p className="text-xs text-gray-400">Seleccioná primero un envío</p>}
              {itemsForEnvio.map((it: any) => {
                const selected = form.items_proporcionales.find((p: any) => p.id_item === it.id_item)
                const prop = selected ? calcProporcional(selected) : 0
                return (
                  <div key={it.id_item}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm mb-1">
                      <input type="checkbox" checked={!!selected} onChange={() => toggleItem(it)} className="rounded" />
                      <span className="font-medium">{it.id_item}</span>
                      <span className="text-gray-500">{it.detalle}</span>
                      {selected && prop > 0 && <span className="ml-auto text-[#6B1A1A] text-xs">{fmtUSD(prop)}</span>}
                    </label>
                    {selected && (
                      <div className="grid grid-cols-2 gap-3 ml-6 mt-1">
                        <Input label="Volumen (m³)" type="number" step="0.001" value={selected.volumen_item_m3} onChange={(e: any) => setProp(it.id_item, 'volumen_item_m3', e.target.value)} />
                        <Input label="Peso (kg)" type="number" step="0.1" value={selected.peso_item_kg} onChange={(e: any) => setProp(it.id_item, 'peso_item_kg', e.target.value)} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {form.items_proporcionales.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Peso total: <strong>{fmt(pesoTotal, 0)} kg</strong>
                {selectedContainer && ` / máx ${fmt(selectedContainer.peso_max_kg, 0)} kg`}
                {' · '}Volumen total: <strong>{fmt(volTotal, 3)} m³</strong>
              </p>
            )}
          </section>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Guardar'}</Button>
        </div>
      </Modal>
    </div>
  )
}
