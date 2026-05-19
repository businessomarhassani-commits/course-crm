import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamClient } from './team-client'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: profiles }, { data: sales }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at'),
    supabase.from('sales').select('closer_id, amount, refund_status'),
  ])

  return <TeamClient profiles={profiles ?? []} sales={sales ?? []} currentUserId={user!.id} />
}
