import { createClient } from '@/lib/supabase/server'
import { PipelineClient } from './pipeline-client'

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  const query = supabase
    .from('leads')
    .select('*, assignee:profiles!leads_assigned_to_fkey(id, full_name)')
    .in('status', ['New', 'Contacted', 'Interested', 'Follow-up', 'Closed', 'Lost'])
    .order('created_at', { ascending: false })

  if (profile?.role === 'closer') {
    query.eq('assigned_to', user!.id)
  }

  const { data: leads } = await query

  return (
    <PipelineClient
      initialLeads={leads ?? []}
      currentUserId={user!.id}
      currentUserRole={profile?.role ?? 'closer'}
    />
  )
}
