import { createClient } from '@/lib/supabase/server'
import { TasksClient } from './tasks-client'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  const [{ data: tasks }, { data: leads }, { data: profiles }] = await Promise.all([
    supabase.from('tasks').select('*, assignee:profiles!tasks_assigned_to_fkey(id, full_name), leads(id, full_name)').order('due_date', { ascending: true }),
    supabase.from('leads').select('id, full_name').order('full_name'),
    supabase.from('profiles').select('id, full_name, role, email'),
  ])

  return (
    <TasksClient
      initialTasks={tasks ?? []}
      leads={leads ?? []}
      profiles={profiles ?? []}
      currentUserId={user!.id}
      currentUserRole={profile?.role ?? 'closer'}
    />
  )
}
