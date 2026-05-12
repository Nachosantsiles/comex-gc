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
import { Plus, Pencil, Trash2, ShieldCheck, Lock } from 'lucide-react'
import { PERMISSIONS, ROLE_PERMISSIONS, type Permission } from '@/lib/permissions'

// ── Role metadata ─────────────────────────────────────────────────────────────

const roleVariant: Record<string, any> = {
  admin: 'danger', supervisor: 'default', operador: 'secondary',
  cliente: 'secondary', editor: 'default', viewer: 'secondary',
}
const roleLabels: Record<string, string> = {
  admin: 'Administrador', supervisor: 'Supervisor', operador: 'Operador',
  cliente: 'Cliente', editor: 'Editor', viewer: 'Visor',
}

// ── Permission groups for the modal UI ───────────────────────────────────────

const PERM_GROUPS: { label: string; perms: Permission[] }[] = [
  {
    label: 'Dashboard',
    perms: ['dashboard:view', 'dashboard:export'],
  },
  {
    label: 'Envíos',
    perms: ['envios:view', 'envios:create', 'envios:edit', 'envios:delete'],
  },
  {
    label: 'Ítems',
    perms: ['items:view', 'items:create', 'items:edit', 'items:delete'],
  },
  {
    label: 'Aduana',
    perms: ['aduana:view', 'aduana:create', 'aduana:edit', 'aduana:delete'],
  },
  {
    label: 'Gastos Logísticos',
    perms: ['gastos:view', 'gastos:create', 'gastos:edit', 'gastos:delete'],
  },
  {
    label: 'Detalle + GI',
    perms: ['detalle:view', 'detalle:edit'],
  },
  {
    label: 'Documentos',
    perms: ['documentos:view', 'documentos:upload', 'documentos:delete'],
  },
  {
    label: 'Análisis',
    perms: ['reportes:view', 'reportes:export', 'reportes:snapshot', 'totales:view', 'totales:export'],
  },
  {
    label: 'Calendario',
    perms: ['calendario:view'],
  },
  {
    label: 'Administración',
    perms: ['admin:view', 'admin:manage_users', 'admin:manage_permissions'],
  },
]

const PERM_LABELS: Record<string, string> = {
  'dashboard:view': 'Ver Dashboard',
  'dashboard:export': 'Exportar Dashboard',
  'envios:view': 'Ver Envíos',
  'envios:create': 'Crear Envíos',
  'envios:edit': 'Editar Envíos',
  'envios:delete': 'Eliminar Envíos',
  'items:view': 'Ver Ítems',
  'items:create': 'Crear Ítems',
  'items:edit': 'Editar Ítems',
  'items:delete': 'Eliminar Ítems',
  'aduana:view': 'Ver Aduana',
  'aduana:create': 'Crear en Aduana',
  'aduana:edit': 'Editar Aduana',
  'aduana:delete': 'Eliminar Aduana',
  'gastos:view': 'Ver Gastos',
  'gastos:create': 'Crear Gastos',
  'gastos:edit': 'Editar Gastos',
  'gastos:delete': 'Eliminar Gastos',
  'detalle:view': 'Ver Detalle',
  'detalle:edit': 'Editar Detalle',
  'documentos:view': 'Ver Documentos',
  'documentos:upload': 'Subir Documentos',
  'documentos:delete': 'Eliminar Documentos',
  'reportes:view': 'Ver Reportes',
  'reportes:export': 'Exportar Reportes',
  'reportes:snapshot': 'Guardar Snapshot',
  'totales:view': 'Ver Totales',
  'totales:export': 'Exportar Totales',
  'calendario:view': 'Ver Calendario',
  'admin:view': 'Ver Administración',
  'admin:manage_users': 'Gestionar Usuarios',
  'admin:manage_permissions': 'Gestionar Permisos',
}

// ── Types ─────────────────────────────────────────────────────────────────────

const emptyUser = { name: '', email: '', password: '', role: 'operador', active: true }

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session } = useSession()
  const me = (session?.user as any)

  const [users, setUsers] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [permOpen, setPermOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [permUser, setPermUser] = useState<any | null>(null)
  const [form, setForm] = useState({ ...emptyUser })
  const [saving, setSaving] = useState(false)

  // Permissions modal state
  // activePerms: set of permissions currently enabled for permUser
  const [activePerms, setActivePerms] = useState<Set<string>>(new Set())
  const [permSaving, setPermSaving] = useState(false)

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

  async function openPerms(u: any) {
    setPermUser(u)
    setPermSaving(false)
    // Load current overrides from server
    const r = await fetch(`/api/users/${u.id}/permissions`)
    if (r.ok) {
      const data = await r.json()
      // Start from role defaults, then apply overrides
      const base = new Set<string>(ROLE_PERMISSIONS[data.role] ?? [])
      for (const o of (data.overrides as { permission: string; granted: number }[])) {
        if (o.granted) base.add(o.permission)
        else base.delete(o.permission)
      }
      setActivePerms(base)
    }
    setPermOpen(true)
  }

  function togglePerm(perm: string) {
    setActivePerms(prev => {
      const next = new Set(prev)
      if (next.has(perm)) next.delete(perm)
      else next.add(perm)
      return next
    })
  }

  async function savePerms() {
    if (!permUser) return
    setPermSaving(true)
    // Compute overrides relative to role defaults
    const roleDefaults = new Set<string>(ROLE_PERMISSIONS[permUser.role] ?? [])
    const overrides: { permission: string; granted: boolean }[] = []
    const allPerms = Object.values(PERMISSIONS)

    for (const perm of allPerms) {
      const inRole = roleDefaults.has(perm)
      const inActive = activePerms.has(perm)
      if (inRole !== inActive) {
        // This permission differs from the role default — record as override
        overrides.push({ permission: perm, granted: inActive })
      }
    }

    await fetch(`/api/users/${permUser.id}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overrides }),
    })
    setPermSaving(false)
    setPermOpen(false)
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
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Editar usuario">
                        <Pencil size={15} />
                      </Button>
                      {u.role !== 'admin' && (
                        <Button variant="ghost" size="icon" onClick={() => openPerms(u)} title="Gestionar permisos">
                          <Lock size={15} className="text-blue-500" />
                        </Button>
                      )}
                      {u.email !== me?.email && (
                        <Button variant="ghost" size="icon" onClick={() => del(u.id)} title="Eliminar usuario">
                          <Trash2 size={15} className="text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* User create/edit modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar Usuario' : 'Nuevo Usuario'} size="sm">
        <div className="space-y-4">
          <Input label="Nombre completo" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Juan García" required />
          <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="usuario@cazorla.com" required />
          <Input label={editing ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'} type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" required={!editing} />
          <Select
            label="Rol"
            options={[
              { value: 'admin',      label: 'Administrador — acceso total' },
              { value: 'supervisor', label: 'Supervisor — operaciones + análisis, sin eliminar' },
              { value: 'operador',   label: 'Operador — operaciones, sin reportes' },
              { value: 'cliente',    label: 'Cliente — solo lectura de envíos y documentos' },
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

      {/* Permissions modal */}
      <Modal open={permOpen} onClose={() => setPermOpen(false)} title={`Permisos — ${permUser?.name ?? ''}`} size="md">
        {permUser && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Rol base: <span className="font-semibold text-gray-700">{roleLabels[permUser.role] ?? permUser.role}</span>.
              Los cambios aquí anulan los permisos del rol para este usuario.
            </p>
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
              {PERM_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{group.label}</p>
                  <div className="space-y-1.5">
                    {group.perms.map(perm => {
                      const isActive = activePerms.has(perm)
                      const inRole = (ROLE_PERMISSIONS[permUser.role] ?? []).includes(perm)
                      const isOverride = isActive !== inRole
                      return (
                        <label key={perm} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => togglePerm(perm)}
                            className="w-4 h-4 rounded accent-blue-600"
                          />
                          <span className="text-sm text-gray-700 flex-1">{PERM_LABELS[perm] ?? perm}</span>
                          {isOverride && (
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {isActive ? '+ añadido' : '− quitado'}
                            </span>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
              <button
                className="text-xs text-gray-400 hover:text-gray-600 underline"
                onClick={() => setActivePerms(new Set(ROLE_PERMISSIONS[permUser.role] ?? []))}
              >
                Restaurar defaults del rol
              </button>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setPermOpen(false)}>Cancelar</Button>
                <Button onClick={savePerms} disabled={permSaving}>{permSaving ? 'Guardando...' : 'Guardar Permisos'}</Button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
