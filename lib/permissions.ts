export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard:view',
  DASHBOARD_EXPORT: 'dashboard:export',
  ENVIOS_VIEW: 'envios:view',
  ENVIOS_CREATE: 'envios:create',
  ENVIOS_EDIT: 'envios:edit',
  ENVIOS_DELETE: 'envios:delete',
  ITEMS_VIEW: 'items:view',
  ITEMS_CREATE: 'items:create',
  ITEMS_EDIT: 'items:edit',
  ITEMS_DELETE: 'items:delete',
  ADUANA_VIEW: 'aduana:view',
  ADUANA_CREATE: 'aduana:create',
  ADUANA_EDIT: 'aduana:edit',
  ADUANA_DELETE: 'aduana:delete',
  GASTOS_VIEW: 'gastos:view',
  GASTOS_CREATE: 'gastos:create',
  GASTOS_EDIT: 'gastos:edit',
  GASTOS_DELETE: 'gastos:delete',
  DETALLE_VIEW: 'detalle:view',
  DETALLE_EDIT: 'detalle:edit',
  DOCUMENTOS_VIEW: 'documentos:view',
  DOCUMENTOS_UPLOAD: 'documentos:upload',
  DOCUMENTOS_DELETE: 'documentos:delete',
  REPORTES_VIEW: 'reportes:view',
  REPORTES_EXPORT: 'reportes:export',
  REPORTES_SNAPSHOT: 'reportes:snapshot',
  TOTALES_VIEW: 'totales:view',
  TOTALES_EXPORT: 'totales:export',
  CALENDARIO_VIEW: 'calendario:view',
  ADMIN_VIEW: 'admin:view',
  ADMIN_MANAGE_USERS: 'admin:manage_users',
  ADMIN_MANAGE_PERMS: 'admin:manage_permissions',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

const SUPERVISOR_PERMS: Permission[] = [
  'dashboard:view', 'dashboard:export',
  'envios:view', 'envios:create', 'envios:edit',
  'items:view', 'items:create', 'items:edit',
  'aduana:view', 'aduana:create', 'aduana:edit',
  'gastos:view', 'gastos:create', 'gastos:edit',
  'detalle:view', 'detalle:edit',
  'documentos:view', 'documentos:upload',
  'reportes:view', 'reportes:export', 'reportes:snapshot',
  'totales:view', 'totales:export',
  'calendario:view',
]

const OPERADOR_PERMS: Permission[] = [
  'dashboard:view',
  'envios:view', 'envios:create', 'envios:edit',
  'items:view', 'items:create', 'items:edit',
  'aduana:view', 'aduana:create', 'aduana:edit',
  'gastos:view', 'gastos:create', 'gastos:edit',
  'detalle:view', 'detalle:edit',
  'documentos:view', 'documentos:upload',
  'calendario:view',
]

const CLIENTE_PERMS: Permission[] = [
  'envios:view',
  'items:view',
  'aduana:view',
  'documentos:view',
  'calendario:view',
]

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: Object.values(PERMISSIONS) as Permission[],
  supervisor: SUPERVISOR_PERMS,
  operador: OPERADOR_PERMS,
  cliente: CLIENTE_PERMS,
  editor: SUPERVISOR_PERMS,
  viewer: CLIENTE_PERMS,
}

// Maps route prefixes to the permission required to access them
export const ROUTE_PERMISSION_MAP: Record<string, Permission> = {
  '/dashboard': 'dashboard:view',
  '/envios': 'envios:view',
  '/items': 'items:view',
  '/calendario': 'calendario:view',
  '/aduana': 'aduana:view',
  '/detalle': 'detalle:view',
  '/gastos': 'gastos:view',
  '/totales': 'totales:view',
  '/reportes': 'reportes:view',
  '/documentos': 'documentos:view',
  '/admin': 'admin:view',
}

const ORDERED_ROUTES = [
  '/dashboard', '/envios', '/items', '/calendario', '/aduana',
  '/detalle', '/gastos', '/totales', '/reportes', '/documentos', '/admin',
]

export function findFirstAccessibleRoute(permissions: string[]): string {
  for (const route of ORDERED_ROUTES) {
    const perm = ROUTE_PERMISSION_MAP[route]
    if (!perm || permissions.includes(perm)) return route
  }
  return '/login'
}

export function computePermissions(
  role: string,
  overrides: { permission: string; granted: number }[]
): Permission[] {
  const base = new Set<Permission>(ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.viewer)
  for (const o of overrides) {
    if (o.granted) base.add(o.permission as Permission)
    else base.delete(o.permission as Permission)
  }
  return Array.from(base)
}
