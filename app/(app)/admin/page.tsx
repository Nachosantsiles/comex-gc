'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Topbar } from '@/components/layout/topbar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'

const roleVariant: Record<string, any> = { admin: 'danger', editor: 'default', viewer: 'secondary' }
const roleLabels: Record<string, string> = { admin: 'Administrador', editor: 'Editor', viewer: 'Visor' }

const emptyUser = { name: '', email: '', password: '', role: 'viewer', active: true }

export default function AdminPage() {
  const { data: session } = useSession()
  const me = (session?.user as any)
  const [users, setUsers] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState({ ...emptyUser })
  const [saving, setSaving] = useState(false)

  async function load() {
    const r = await fetch('/api/users')
    if (r.ok) setUsers(await r.json())
  }
  useEffect(() => { load() }, [])

  function openNew() { setForm({ ...emptyUser }); setEditing(null); setOpen(true) }
  function openEdit(u: any) { setForm({ ...u, password: '', active: u.active === 1 }); setEditing(u); setOpen(true) }
  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setSaving(true)
    if (editing) {
      await fetch(`/api/users/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    } else {
      await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    }
    setSaving(false); setOpen(false); load()
  }

  async function del(id: number) {
    if (!confirm('¿Eliminar este usuario?')) return
    await fetch(`/api/users/${id}`, { method: 'DELETE' }); load()
  }

  if (me?.role !== 'admin') {
    return (
      <div>
        <Topbar title="Administración" />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Solo los administradores pueden acceder a esta sección.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Topbar title="Administración de Usuarios" />
      <div className="p-6">
        <div className="flex justify-between items-center mb-5">
          <p className="text-sm text-gray-500">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
          <Button onClick={openNew}><Plus size={16} />Nuevo Usuario</Button>
        </div>

        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Nombre', 'Email', 'Rol', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#6B1A1A] flex items-center justify-center text-white text-xs font-semibold">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{u.name}</span>
                      {u.email === me?.email && <Badge variant="default" className="text-xs">Yo</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={roleVariant[u.role] ?? 'secondary'} className="gap-1">
                      {u.role === 'admin' && <ShieldCheck size={12} />}
                      {roleLabels[u.role] ?? u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.active ? 'success' : 'secondary'}>{u.active ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil size={15} /></Button>
                      {u.email !== me?.email && (
                        <Button variant="ghost" size="icon" onClick={() => del(u.id)}><Trash2 size={15} className="text-red-500" /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar Usuario' : 'Nuevo Usuario'} size="sm">
        <div className="space-y-4">
          <Input label="Nombre completo" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Juan García" required />
          <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="usuario@cazorla.com" required />
          <Input label={editing ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'} type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required={!editing} />
          <Select
            label="Rol"
            options={[
              { value: 'admin', label: 'Administrador — acceso total' },
              { value: 'editor', label: 'Editor — puede crear y editar' },
              { value: 'viewer', label: 'Visor — solo lectura' },
            ]}
            value={form.role}
            onChange={e => set('role', e.target.value)}
          />
          {editing && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="rounded" />
              Usuario activo
            </label>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !form.name || !form.email}>{saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear Usuario'}</Button>
        </div>
      </Modal>
    </div>
  )
}
