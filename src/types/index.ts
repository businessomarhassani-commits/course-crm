export type Role = 'admin' | 'closer' | 'partner' | 'support'

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Follow-up'
  | 'Closed'
  | 'No answer'
  | 'Lost'
  | 'Refund'

export type PaymentStatus = 'Pending' | 'Confirmed' | 'Refunded'

export type StudentStatus = 'Active' | 'Completed' | 'Refunded'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: Role
  avatar_url: string | null
  created_at: string
}

export interface Lead {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  instagram: string | null
  facebook: string | null
  lead_source: string | null
  assigned_to: string | null
  status: LeadStatus
  notes: string | null
  interested_offer: string | null
  budget: number | null
  country: string | null
  ad_creative_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
  assignee?: Profile
}

export interface Sale {
  id: string
  lead_id: string | null
  customer_name: string
  offer: string
  amount: number
  payment_method: string | null
  closer_id: string | null
  refund_status: boolean
  created_at: string
  leads?: Lead
  closer?: Profile
}

export interface Payment {
  id: string
  sale_id: string | null
  amount: number
  method: string | null
  status: PaymentStatus
  proof_url: string | null
  notes: string | null
  created_at: string
  sales?: Sale
}

export interface Task {
  id: string
  title: string
  description: string | null
  assigned_to: string | null
  due_date: string | null
  completed: boolean
  lead_id: string | null
  created_by: string | null
  created_at: string
  assignee?: Profile
  leads?: Lead
}

export interface Note {
  id: string
  lead_id: string
  content: string
  created_by: string | null
  created_at: string
  author?: Profile
}

export interface ContentTracking {
  id: string
  name: string
  platform: string | null
  ctr: number | null
  cpl: number | null
  roas: number | null
  notes: string | null
  is_winner: boolean
  created_by: string | null
  created_at: string
}

export interface Activity {
  id: string
  type: string
  description: string
  user_id: string | null
  lead_id: string | null
  created_at: string
  user?: Profile
}

export interface Notification {
  id: string
  user_id: string | null
  title: string
  message: string | null
  read: boolean
  created_at: string
}

export interface Student {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  amount_paid: number
  payment_method: string | null
  proof_url: string | null
  enrollment_date: string | null
  status: StudentStatus
  notes: string | null
  attendance: Record<string, boolean>
  created_by: string | null
  created_at: string
}
