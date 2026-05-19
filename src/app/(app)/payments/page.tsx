import { createClient } from '@/lib/supabase/server'
import { PaymentsClient } from './payments-client'

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  const [{ data: payments }, { data: sales }] = await Promise.all([
    supabase.from('payments').select('*, sales(id, customer_name, offer, amount)').order('created_at', { ascending: false }),
    supabase.from('sales').select('id, customer_name, offer').order('customer_name'),
  ])

  return (
    <PaymentsClient
      initialPayments={payments ?? []}
      sales={sales ?? []}
      currentUserId={user!.id}
      currentUserRole={profile?.role ?? 'closer'}
    />
  )
}
