import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LeadDetailClient } from './lead-detail-client'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: lead },
    { data: notes },
    { data: activities },
    { data: tasks },
    { data: profiles },
    { data: { user } },
  ] = await Promise.all([
    supabase.from('leads').select('*, assignee:profiles!leads_assigned_to_fkey(id, full_name, role, email)').eq('id', id).single(),
    supabase.from('notes').select('*, author:profiles(full_name)').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('activities').select('*, user:profiles(full_name)').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('tasks').select('*, assignee:profiles(full_name)').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, role, email'),
    supabase.auth.getUser(),
  ])

  if (!lead) notFound()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  return (
    <LeadDetailClient
      lead={lead}
      notes={notes ?? []}
      activities={activities ?? []}
      tasks={tasks ?? []}
      profiles={profiles ?? []}
      currentUserId={user!.id}
      currentUserRole={profile?.role ?? 'closer'}
    />
  )
}
