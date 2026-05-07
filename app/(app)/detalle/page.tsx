'use client'
import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { MONEDAS } from '@/lib/constants'
import { fmtUSD } from '@/lib/utils'

const GI_CONCEPTOS_DEFAULT = [
  '010 - Derecho de Importación', '011 - Tasa Estadística', '065 - D.I. Usados',
  '415 - IVA', 'IVA Inscripto', 'Ingresos Brutos', 'Imp. Ganancias', 'Arancel SIM',
]

const emptyDetalle = {
  id_item: '', id_despacho: '', proveedor_internacional: '',
  precio_orig: '', moneda_orig: 'USD', tc_a_usd: '1',
  precio_usd: '', comision_sf_pct: '10', precio_sf_usd: '',
  valor_factura_sf: '', nro_factura_sf: '', fecha_factura_sf: '',
  moneda_sf: 'EUR', tc_sf_a_usd: '1',
  sf_mercaderia: '', sf_flete: '', sf_seguro: '', total_sf: '', total_sf_usd: '',
  gastos_importacion_items: [] as any[],
  otros_gastos_items: [] as any[],
}

export default function DetallePage() {
  const [rows, setRows] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [despachos, setDespachos] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<any>({ ...emptyDetalle })
  const [saving, setSaving] = useState(false)
  const [addingProv, setAddingProv] = useState(false)
  const [newProv, setNewProv] = useState('')

  async function load() {
    const [dr, ir, desr, pr] = await Promise.all([
      fetch('/api/detalle'), fetch('/api/items'), fetch('/api/despachos'), fetch('/api/proveedores'),
    ])
    setRows(await dr.json())
    setItems(await ir.json())
    setDespachos(await desr.json())
    setProveedores(await pr.json())
  }
  useEffect(() => { load() }, [])

  async function openEdit(row: any) {
    const r = await fetch(`/api/detalle/${row.id_item}`)
    const data = await r.json()
    const det = data.detalle ?? {}
    setForm({
      ...emptyDetalle,
      ...det,
      precio_orig: det.precio_orig ?? '',
      tc_a_usd: det.tc_a_usd ?? '1',
      precio_usd: det.precio_usd ?? '',
      comision_sf_pct: det.comision_sf_pct ?? '10',
      precio_sf_usd: det.precio_sf_usd ?? '',
      valor_factura_sf: det.valor_factura_sf ?? '',
      sf_mercaderia: det.sf_mercaderia ?? '',
      sf_flete: det.sf_flete ?? '',
      sf_seguro: det.sf_seguro ?? '',
      total_sf: det.total_sf ?? '',
      total_sf_usd: det.total_sf_usd ?? '',
      moneda_sf: det.moneda_sf ?? 'EUR',
      tc_sf_a_usd: det.tc_sf_a_usd ?? '1',
      gastos_importacion_items: data.gi_items?.length
        ? data.gi_items
        : GI_CONCEPTOS_DEFAULT.map((c, i) => ({ concepto: c, monto_usd: '', orden: i })),
      otros_gastos_items: data.otros_items ?? [],
    })
    setOpen(true)
  }

  function openNew() {
    setForm({
      ...emptyDetalle,
      gastos_importacion_items: GI_CONCEPTOS_DEFAULT.map((c, i) => ({ concepto: c, monto_usd: '', orden: i })),
      otros_gastos_items: [],
    })
    setOpen(true)
  }

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })) }

  // SF calculations
  function calcSF() {
    const orig = parseFloat(form.precio_orig) || 0
    const tc = parseFloat(form.tc_a_usd) || 1
    const pct = parseFloat(form.comision_sf_pct) || 10
    const precioUSD = form.moneda_orig === 'USD' ? orig : orig * tc
    const sfUSD = precioUSD * (pct / 100)
    set('precio_usd', precioUSD.toFixed(2))
    set('precio_sf_usd', sfUSD.toFixed(2))
  }

  function calcSFTotal() {
    const merc = parseFloat(form.sf_mercaderia) || 0
    const flete = parseFloat(form.sf_flete) || 0
    const seguro = parseFloat(form.sf_seguro) || 0
    const total = merc + flete + seguro
    const tc = parseFloat(form.tc_sf_a_usd) || 1
    const totalUSD = form.moneda_sf === 'USD' ? total : total * tc
    set('total_sf', total.toFixed(2))
    set('total_sf_usd', totalUSD.toFixed(2))
  }

  // GI items
  function addGI() {
    set('gastos_importacion_items', [...form.gastos_importacion_items, { concepto: '', monto_usd: '', orden: form.gastos_importacion_items.length }])
  }
  function setGI(idx: number, k: string, v: string) {
    setForm((f: any) => ({
      ...f,
      gastos_importacion_items: f.gastos_importacion_items.map((gi: any, i: number) => i === idx ? { ...gi, [k]: v } : gi),
    }))
  }
  function removeGI(idx: number) {
    set('gastos_importacion_items', form.gastos_importacion_items.filter((_: any, i: number) => i !== idx))
  }
  const totalGI = form.gastos_importacion_items.reduce((a: number, gi: any) => a + (parseFloat(gi.monto_usd) || 0), 0)

  // Otros items
  function addOtro() {
    set('otros_gastos_items', [...form.otros_gastos_items, { concepto: '', precio_pesos: '', tipo_cambio: '', total_usd: '', orden: form.otros_gastos_items.length }])
  }
  function setOtro(idx: number, k: string, v: string) {
    setForm((f: any) => ({
      ...f,
      otros_gastos_items: f.otros_gastos_items.map((og: any, i: number) => i === idx ? { ...og, [k]: v } : og),
    }))
  }
  function removeOtro(idx: number) {
    set('otros_gastos_items', form.otros_gastos_items.filter((_: any, i: number) => i !== idx))
  }

  async function addProveedor() {
    const v = newProv.trim()
    if (!v) return
    await fetch('/api/proveedores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: v }) })
    const r = await fetch('/api/proveedores')
    setProveedores(await r.json())
    set('proveedor_internacional', v)
    setAddingProv(false)
    setNewProv('')
  }

  async function save() {
    setSaving(true)
    const body = {
      ...form,
      precio_orig: form.precio_orig ? Number(form.precio_orig) : null,
      tc_a_usd: form.tc_a_usd ? Number(form.tc_a_usd) : 1,
      precio_usd: form.precio_usd ? Number(form.precio_usd) : null,
      comision_sf_pct: form.comision_sf_pct ? Number(form.comision_sf_pct) : 10,
      precio_sf_usd: form.precio_sf_usd ? Number(form.precio_sf_usd) : null,
      valor_factura_sf: form.valor_factura_sf ? Number(form.valor_factura_sf) : null,
      tc_sf_a_usd: form.tc_sf_a_usd ? Number(form.tc_sf_a_usd) : 1,
      sf_mercaderia: form.sf_mercaderia ? Number(form.sf_mercaderia) : null,
      sf_flete: form.sf_flete ? Number(form.sf_flete) : null,
      sf_seguro: form.sf_seguro ? Number(form.sf_seguro) : null,
      total_sf: form.total_sf ? Number(form.total_sf) : null,
      total_sf_usd: form.total_sf_usd ? Number(form.total_sf_usd) : null,
      gastos_importacion_items: form.gastos_importacion_items.map((gi: any, i: number) => ({
        concepto: gi.concepto,
        monto_usd: gi.monto_usd ? Number(gi.monto_usd) : 0,
        orden: i,
      })),
      otros_gastos_items: form.otros_gastos_items.map((og: any, i: number) => ({
        concepto: og.concepto,
        precio_pesos: og.precio_pesos ? Number(og.precio_pesos) : null,
        tipo_cambio: og.tipo_cambio ? Number(og.tipo_cambio) : null,
        total_usd: og.total_usd ? Number(og.total_usd) : null,
        orden: i,
      })),
    }
    await fetch('/api/detalle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false); setOpen(false); load()
  }

  return (
    <div>
      <Topbar title="Detalle + GI" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-5">
          <p className="text-sm text-gray-500">{rows.length} registro{rows.length !== 1 ? 's' : ''}</p>
          <Button onClick={openNew}><Plus size={16} />Nuevo Detalle</Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['ID Ítem', 'Detalle', 'Proveedor', 'Precio Orig', 'Moneda', 'Precio USD', 'Comisión SF', 'Moneda SF', 'Total SF USD', 'Total GI', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-12 text-gray-400">No hay registros</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id_item} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-[#6B1A1A]">{r.id_item}</td>
                    <td className="px-4 py-3">{r.item_detalle ?? '-'}</td>
                    <td className="px-4 py-3">{r.proveedor_internacional ?? '-'}</td>
                    <td className="px-4 py-3">{r.precio_orig ?? '-'}</td>
                    <td className="px-4 py-3">{r.moneda_orig ?? '-'}</td>
                    <td className="px-4 py-3">{fmtUSD(r.precio_usd)}</td>
                    <td className="px-4 py-3">{r.comision_sf_pct ?? 10}%</td>
                    <td className="px-4 py-3">{r.moneda_sf ?? 'EUR'}</td>
                    <td className="px-4 py-3">{fmtUSD(r.total_sf_usd)}</td>
                    <td className="px-4 py-3">{fmtUSD(r.total_gi)}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil size={15} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Detalle de Compra + Gastos de Importación" size="2xl">
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">

          {/* Identificación */}
          <section>
            <p className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Identificación</p>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Ítem" options={items.map(i => ({ value: i.id_item, label: `${i.id_item} — ${i.detalle ?? ''}` }))} placeholder="Seleccionar..." value={form.id_item} onChange={(e: any) => set('id_item', e.target.value)} />
              <Select label="Despacho" options={despachos.map(d => ({ value: d.id_despacho, label: d.id_despacho }))} placeholder="Seleccionar..." value={form.id_despacho} onChange={(e: any) => set('id_despacho', e.target.value)} />
            </div>
          </section>

          {/* Proveedor */}
          <section>
            <p className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Proveedor Internacional</p>
            {addingProv ? (
              <div className="flex gap-2">
                <input value={newProv} onChange={e => setNewProv(e.target.value)} onKeyDown={e => e.key === 'Enter' && addProveedor()} placeholder="Nombre del proveedor..." className="flex-1 rounded-lg border border-[#9B2828] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#6B1A1A]" autoFocus />
                <Button onClick={addProveedor}>Guardar</Button>
                <Button variant="secondary" onClick={() => { setAddingProv(false); setNewProv('') }}>Cancelar</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select value={form.proveedor_internacional} onChange={e => set('proveedor_internacional', e.target.value)} className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#6B1A1A] focus:outline-none focus:ring-1 focus:ring-[#6B1A1A]">
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => <option key={p} value={p}>{p}</option>)}
                  {form.proveedor_internacional && !proveedores.includes(form.proveedor_internacional) && (
                    <option value={form.proveedor_internacional}>{form.proveedor_internacional}</option>
                  )}
                </select>
                <Button variant="outline" onClick={() => setAddingProv(true)}><Plus size={15} />Nuevo</Button>
              </div>
            )}
          </section>

          {/* Precio del proveedor */}
          <section>
            <p className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Precio del Proveedor</p>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Precio Original" type="number" step="0.01" value={form.precio_orig} onChange={(e: any) => set('precio_orig', e.target.value)} />
              <Select label="Moneda" options={MONEDAS} value={form.moneda_orig} onChange={(e: any) => set('moneda_orig', e.target.value)} />
              <Input label="TC a USD" type="number" step="0.0001" value={form.tc_a_usd} onChange={(e: any) => set('tc_a_usd', e.target.value)} />
              <div className="flex items-end col-span-1">
                <Button variant="outline" onClick={calcSF} className="w-full">Calcular precio USD →</Button>
              </div>
              <Input label="Precio en USD" type="number" step="0.01" value={form.precio_usd} onChange={(e: any) => set('precio_usd', e.target.value)} />
              <Input label="Comisión SF %" type="number" step="0.01" value={form.comision_sf_pct} onChange={(e: any) => set('comision_sf_pct', e.target.value)} />
              <Input label="Comisión SF (USD)" type="number" step="0.01" value={form.precio_sf_usd} onChange={(e: any) => set('precio_sf_usd', e.target.value)} />
            </div>
          </section>

          {/* Stone Factory */}
          <section>
            <p className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b">Stone Factory (SF) — Factura</p>
            <div className="grid grid-cols-3 gap-4">
              <Input label="N° Factura SF" value={form.nro_factura_sf} onChange={(e: any) => set('nro_factura_sf', e.target.value)} />
              <Input label="Fecha Factura SF" type="date" value={form.fecha_factura_sf} onChange={(e: any) => set('fecha_factura_sf', e.target.value)} />
              <Input label="Valor Factura SF" type="number" step="0.01" value={form.valor_factura_sf} onChange={(e: any) => set('valor_factura_sf', e.target.value)} />
              <Select label="Moneda SF" options={MONEDAS} value={form.moneda_sf} onChange={(e: any) => set('moneda_sf', e.target.value)} />
              <Input label="TC SF a USD" type="number" step="0.0001" value={form.tc_sf_a_usd} onChange={(e: any) => set('tc_sf_a_usd', e.target.value)} />
              <div />
              <Input label={`SF Mercadería (${form.moneda_sf})`} type="number" step="0.01" value={form.sf_mercaderia} onChange={(e: any) => set('sf_mercaderia', e.target.value)} />
              <Input label={`SF Flete (${form.moneda_sf})`} type="number" step="0.01" value={form.sf_flete} onChange={(e: any) => set('sf_flete', e.target.value)} />
              <Input label={`SF Seguro (${form.moneda_sf})`} type="number" step="0.01" value={form.sf_seguro} onChange={(e: any) => set('sf_seguro', e.target.value)} />
              <div className="flex items-end">
                <Button variant="outline" onClick={calcSFTotal} className="w-full">Calcular total SF →</Button>
              </div>
              <Input label={`Total SF (${form.moneda_sf})`} type="number" step="0.01" value={form.total_sf} onChange={(e: any) => set('total_sf', e.target.value)} />
              <Input label="Total SF (USD)" type="number" step="0.01" value={form.total_sf_usd} onChange={(e: any) => set('total_sf_usd', e.target.value)} />
            </div>
          </section>

          {/* Gastos de Importación dinámicos */}
          <section>
            <div className="flex items-center justify-between mb-3 pb-1 border-b">
              <div>
                <p className="text-sm font-semibold text-gray-700">Gastos de Importación (USD)</p>
                {totalGI > 0 && <p className="text-xs text-gray-500 mt-0.5">Total: <strong>{fmtUSD(totalGI)}</strong></p>}
              </div>
              <Button variant="outline" size="sm" onClick={addGI}><Plus size={14} />Agregar</Button>
            </div>
            <div className="space-y-2">
              {form.gastos_importacion_items.map((gi: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr_160px_36px] gap-2 items-end">
                  <input value={gi.concepto} onChange={e => setGI(i, 'concepto', e.target.value)} placeholder="Concepto" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6B1A1A] focus:outline-none focus:ring-1 focus:ring-[#6B1A1A]" />
                  <input type="number" step="0.01" value={gi.monto_usd} onChange={e => setGI(i, 'monto_usd', e.target.value)} placeholder="Monto USD" className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-right focus:border-[#6B1A1A] focus:outline-none focus:ring-1 focus:ring-[#6B1A1A]" />
                  <button type="button" onClick={() => removeGI(i)} className="p-2 rounded-lg text-red-400 hover:bg-[#F5EEEE]"><Trash2 size={14} /></button>
                </div>
              ))}
              {form.gastos_importacion_items.length === 0 && (
                <p className="text-xs text-gray-400">Sin ítems. Hacé clic en Agregar.</p>
              )}
            </div>
          </section>

          {/* Otros Gastos dinámicos */}
          <section>
            <div className="flex items-center justify-between mb-3 pb-1 border-b">
              <p className="text-sm font-semibold text-gray-700">Otros Gastos</p>
              <Button variant="outline" size="sm" onClick={addOtro}><Plus size={14} />Agregar</Button>
            </div>
            {form.otros_gastos_items.map((og: any, i: number) => (
              <div key={i} className="grid grid-cols-[1fr_120px_100px_120px_36px] gap-2 items-end mb-2">
                <input value={og.concepto} onChange={e => setOtro(i, 'concepto', e.target.value)} placeholder="Concepto (INAL, ANMAT...)" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6B1A1A] focus:outline-none focus:ring-1 focus:ring-[#6B1A1A]" />
                <input type="number" step="0.01" value={og.precio_pesos} onChange={e => setOtro(i, 'precio_pesos', e.target.value)} placeholder="$ ARS" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6B1A1A] focus:outline-none focus:ring-1 focus:ring-[#6B1A1A]" />
                <input type="number" step="0.01" value={og.tipo_cambio} onChange={e => setOtro(i, 'tipo_cambio', e.target.value)} placeholder="TC" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#6B1A1A] focus:outline-none focus:ring-1 focus:ring-[#6B1A1A]" />
                <input type="number" step="0.01" value={og.total_usd} onChange={e => setOtro(i, 'total_usd', e.target.value)} placeholder="Total USD" className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-right focus:border-[#6B1A1A] focus:outline-none focus:ring-1 focus:ring-[#6B1A1A]" />
                <button type="button" onClick={() => removeOtro(i)} className="p-2 rounded-lg text-red-400 hover:bg-[#F5EEEE]"><Trash2 size={14} /></button>
              </div>
            ))}
            {form.otros_gastos_items.length === 0 && (
              <p className="text-xs text-gray-400">Sin ítems. Hacé clic en Agregar.</p>
            )}
          </section>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.id_item}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </Modal>
    </div>
  )
}
