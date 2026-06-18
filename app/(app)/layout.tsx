import { Sidebar } from '@/components/layout/sidebar'
import { AppShell } from '@/components/layout/app-shell'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <AppShell>{children}</AppShell>
    </div>
  )
}
