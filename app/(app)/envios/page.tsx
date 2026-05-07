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
import { Plus, Pencil, Trash2, Package, History, Lock, Unlock } from 'lucide-react'
import { MODALIDADES, INCOTERMS, GESTIONES, BL_TIPOS } from '@/lib/constants'

const TIPOS_TRANSPORTE = ['Marítimo', 'Aéreo', 'Terrestre Internacional']

const emptyForm = {
  tipo_transporte: '', modalidad: '', nombre_agencia: '', ref_contenedor: '',
  origen: '', destino: '', incoterm: '', gestion: '', nombre_empresa: '',
  bl_awb_crt: '', bl_tipo: '', fecha_carga: '', etd: '', fecha_salida: '',
  eta: '', fecha_llegada_puerto: '', fecha_llegada_lr: '',
  fecha_desconsolidacion: '', observaciones: '', cerrado: false,
}

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

  async function load() {
    const r = await fetch('/api/envios')
    setEnvios(await r.json())
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ ...emptyForm })
    setEditing(null)
    setOriginalDates({ etd: '', eta: '' })
    setOpen(true)
  }

  function openEdit(e: any) {
    setForm({ ...e, cerrado: !!e.cerrado })
    setEditing(e)
    setOriginalDates({ etd: e.etd ?? '', eta: e.eta ?? '' })
    setOpen(true)
  }

  function set(key: string, val: any) { setForm((f: any) => ({ ...f, [key]: val })) }

  async function save() {
    if (editing) {
      const etdChanged = form.etd !== originalDates.etd
      const etaChanged = form.eta !== originalDates.eta
      if (etdChanged || etaChanged) {
        setPendingSave({ ...form })
        setMotivo('')
        setMotivoModal(true)
        return
      }
    }
    await doSave(form, '')
  }

  async function doSave(data: any, motivoCambio: string) {
    setSaving(true)
    const body = { ...data, motivo_cambio_fecha: motivoCambio }
    if (editing) {
      await fetch(`/api/envios/${editing.id_envio}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/envios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    }
    setSaving(false)
    setOpen(false)
    setMotivoModal(false)
    setPendingSave(null)
    load()
  }

  async function confirmMotivo() {
    if (pendingSave) await doSave(pendingSave, motivo)
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar este envío?')) return
    await fetch(`/api/envios/${id}`, { method: 'DELETE' })
    load()
  }

  async function openHistorial(e: any) {
    const r = await fetch(`/api/historial/${e.id_envio}`)
    setHistorial(await r.json())
    setHistorialEnvio(e.id_envio)
    setHistorialModal(true)
  }

  async function toggleCerrado(e: any) {
    await fetch(`/api/envios/${e.id_envio}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...e, cerrado: e.cerrado ? 0 : 1 }),
    })
    load()
  }

  return (
    <div>
      <Topbar title="Envíos" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-5">
          <p className="text-sm text-gray-500">{envios.length} envío{envios.length !== 1 ? 's' : ''} registrado{envios.length !== 1 ? 's' : ''}</p>
          <Button onClick={openNew}><Plus size={16} />Nuevo Envío</Button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['ID Envío', 'Tipo', 'Agencia/Línea', 'Origen → Destino', 'Incoterm', 'ETD', 'ETA', 'Estado', 'Ítems', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {envios.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-12 text-gray-400">No hay envíos registrados</td></tr>
                )}
                {envios.map((e) => (
                  <tr key={e.id_envio} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${e.cerrado ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-[#6B1A1A]">{e.id_envio}</td>
                    <td className="px-4 py-3">{e.tipo_transporte ?? '-'}</td>
                    <td className="px-4 py-3">{e.nombre_agencia ?? '-'}</td>
                    <td className="px-4 py-3">{e.origen ?? '-'} → {e.destino ?? '-'}</td>
                    <td className="px-4 py-3">{e.incoterm ?? '-'}</td>
                    <td className="px-4 py-3">{e.etd ?? '-'}</td>
                    <td className="px-4 py-3">{e.eta ?? '-'}</td>
                    <td className="px-4 py-3">
                      {e.cerrado
                        ? <Badge variant="secondary">Cerrado</Badge>
                        : <Badge variant="success">Activo</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default" className="gap-1"><Package size={12} />{e.total_items ?? 0}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)} title="Editar"><Pencil size={15} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openHistorial(e)} title="Ver historial ETD/ETA"><History size={15} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => toggleCerrado(e)} title={e.cerrado ? 'Reabrir' : 'Cerrar envío'}>
                          {e.cerrado ? <Unlock size={15} className="text-green-600" /> : <Lock size={15} className="text-gray-400" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => del(e.id_envio)}><Trash2 size={15} className="text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal principal */}
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
          <Input label="ETD (Estimated Time of Departure)" type="date" value={form.etd} onChange={(e: any) => set('etd', e.target.value)} />
          <Input label="ETA (Estimated Time of Arrival)" type="date" value={form.eta} onChange={(e: any) => set('eta', e.target.value)} />
          {editing && (form.etd !== originalDates.etd || form.eta !== originalDates.eta) && (
            <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
              Se registrará el cambio de fecha al guardar. Se pedirá motivo.
            </div>
          )}
          <Input label="Fecha de Carga" type="date" value={form.fecha_carga} onChange={(e: any) => set('fecha_carga', e.target.value)} />
          <Input label="Fecha de Salida" type="date" value={form.fecha_salida} onChange={(e: any) => set('fecha_salida', e.target.value)} />
          <Input label="Llegada a Puerto" type="date" value={form.fecha_llegada_puerto} onChange={(e: any) => set('fecha_llegada_puerto', e.target.value)} />
          <Input label="Llegada a LR" type="date" value={form.fecha_llegada_lr} onChange={(e: any) => set('fecha_llegada_lr', e.target.value)} />
          <Input label="Fecha Desconsolidación" type="date" value={form.fecha_desconsolidacion} onChange={(e: any) => set('fecha_desconsolidacion', e.target.value)} />
          <div className="flex items-center gap-2 pt-6">
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

      {/* Modal motivo de cambio de fecha */}
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
              rows={3}
              placeholder="Ej: Demora en puerto de origen, cambio de buque..."
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={() => setMotivoModal(false)}>Cancelar</Button>
          <Button onClick={confirmMotivo} disabled={saving}>{saving ? 'Guardando...' : 'Confirmar cambio'}</Button>
        </div>
      </Modal>

      {/* Modal historial ETD/ETA */}
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
                      <td className="px-3 py-2 text-gray-500">{h.created_at?.slice(0, 16)}</td>
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
