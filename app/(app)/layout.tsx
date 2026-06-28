import { Sidebar } from '@/components/layout/sidebar'
import { AppShell } from '@/components/layout/app-shell'
import { StoreHydration } from '@/components/layout/store-hydration'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreHydration>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <AppShell>{children}</AppShell>
      </div>
    </StoreHydration>
  )
}
