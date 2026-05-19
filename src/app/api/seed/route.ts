import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST() {
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create 3 demo leads
  const { data: leads } = await adminClient.from('leads').insert([
    {
      full_name: 'Carlos Mendoza',
      phone: '+1234567890',
      email: 'carlos@example.com',
      lead_source: 'Instagram',
      status: 'Interested',
      interested_offer: 'Digital Marketing Mastery',
      budget: 997,
      country: 'USA',
      created_by: user.id,
      assigned_to: user.id,
    },
    {
      full_name: 'Sarah Johnson',
      phone: '+0987654321',
      email: 'sarah@example.com',
      lead_source: 'Facebook',
      status: 'Follow-up',
      interested_offer: 'Ecom Blueprint',
      budget: 1497,
      country: 'Canada',
      created_by: user.id,
      assigned_to: user.id,
    },
    {
      full_name: 'Ahmed Hassan',
      phone: '+201012345678',
      email: 'ahmed@example.com',
      lead_source: 'YouTube',
      status: 'Contacted',
      interested_offer: 'Copywriting Course',
      budget: 497,
      country: 'Egypt',
      created_by: user.id,
      assigned_to: user.id,
    },
  ]).select()

  // Create 2 demo sales
  await adminClient.from('sales').insert([
    {
      customer_name: 'Michael Torres',
      offer: 'Digital Marketing Mastery',
      amount: 997,
      payment_method: 'Stripe',
      closer_id: user.id,
      refund_status: false,
    },
    {
      customer_name: 'Lisa Chen',
      offer: 'Ecom Blueprint',
      amount: 1497,
      payment_method: 'Bank Transfer',
      closer_id: user.id,
      refund_status: false,
    },
  ])

  // Create 1 demo task
  if (leads && leads[0]) {
    await adminClient.from('tasks').insert({
      title: 'Follow up with Carlos Mendoza',
      description: 'He was interested in Digital Marketing Mastery — send pricing breakdown',
      assigned_to: user.id,
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      lead_id: leads[0].id,
      created_by: user.id,
      completed: false,
    })
  }

  // Seed activities
  await adminClient.from('activities').insert([
    { type: 'lead_created', description: 'Demo data seeded successfully', user_id: user.id },
  ])

  return NextResponse.json({ success: true, message: 'Demo data seeded!' })
}
