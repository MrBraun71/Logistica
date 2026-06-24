export interface Profile {
  id: string
  user_id: string | null
  organization_id: string | null
  role: 'admin' | 'volunteer' | 'employee' | 'director' | 'operator'
  first_name: string
  last_name: string
  email: string | null
  date_of_birth: string | null
  fiscal_code: string | null
  phone: string | null
  address: string | null
  qualifications: string | null
  certifications: string | null
  photo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  type: 'cri' | 'public_assistance' | 'other'
  address: string | null
  phone: string | null
  email: string | null
  fiscal_code: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  profile_id: string
  role: string
  joined_at: string
  is_active: boolean
}

export interface Shift {
  id: string
  organization_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  type: 'ordinario' | 'straordinario' | 'emergenza' | 'evento'
  vehicle_id: string | null
  max_volunteers: number
  borsoni: number
  dae: number
  rollup: number
  desk: number
  gazebo: number
  equipment_notes: string | null
  status: 'aperto' | 'chiuso' | 'completato' | 'cancellato'
  created_by: string
  created_at: string
  updated_at: string
}

export interface ShiftAssignment {
  id: string
  shift_id: string
  profile_id: string
  status: 'assegnato' | 'confermato' | 'rifiutato' | 'sostituito'
  assigned_at: string
  notes: string | null
}

export interface ShiftAvailability {
  id: string
  profile_id: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  notes: string | null
}

export interface Attendance {
  id: string
  profile_id: string
  shift_id: string | null
  check_in_time: string | null
  check_out_time: string | null
  check_in_location: unknown | null
  check_out_location: unknown | null
  method: 'badge' | 'app' | 'manual'
  organization_id: string
  notes: string | null
}

export interface Vehicle {
  id: string
  organization_id: string
  name: string
  license_plate: string
  type: string | null
  is_active: boolean
}

export interface News {
  id: string
  organization_id: string
  title: string
  content: string
  published_at: string
  created_by: string
}
