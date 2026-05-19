import { createClient } from '@/lib/supabase/server'
import { LeadsClient } from './leads-client'

export default async function LeadsPage() {
  const supabase = await createClient()

  const [
    { data: leads },
    { data: profiles },
    { data: { user } },
    { data: creatives },
  ] = await Promise.all([
    supabase.from('leads').select('*, assignee:profiles!leads_assigned_to_fkey(id, full_name, role)').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, role, email'),
    supabase.auth.getUser(),
    supabase.from('content_tracking').select('id, name, platform').order('name'),
  ])

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  return (
    <LeadsClient
      initialLeads={leads ?? []}
      profiles={profiles ?? []}
      creatives={creatives ?? []}
      currentUserId={user!.id}
      currentUserRole={profile?.role ?? 'closer'}
    />
  )
}
