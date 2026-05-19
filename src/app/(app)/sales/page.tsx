import { createClient } from '@/lib/supabase/server'
import { SalesClient } from './sales-client'

export default async function SalesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  const [{ data: sales }, { data: leads }, { data: profiles }] = await Promise.all([
    supabase.from('sales').select('*, closer:profiles!sales_closer_id_fkey(id, full_name), leads(id, full_name)').order('created_at', { ascending: false }),
    supabase.from('leads').select('id, full_name').order('full_name'),
    supabase.from('profiles').select('id, full_name, role, email'),
  ])

  return (
    <SalesClient
      initialSales={sales ?? []}
      leads={leads ?? []}
      profiles={profiles ?? []}
      currentUserId={user!.id}
      currentUserRole={profile?.role ?? 'closer'}
    />
  )
}
