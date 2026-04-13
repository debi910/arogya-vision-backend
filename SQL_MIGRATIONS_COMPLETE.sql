-- ========================================
-- PHASE 1: Complete SQL Migration Script
-- Arogya Vision Hospital Management System
-- ========================================
-- 
-- Copy ALL of this code at once and paste into Supabase SQL Editor
-- Press "Run" ONE TIME to execute all migrations
-- Expected time: 10-30 seconds
--
-- ========================================

-- ========================================
-- STEP 1: ALTER APPOINTMENTS TABLE
-- Add status tracking and cancellation reason
-- ========================================

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS reason_for_cancellation TEXT;

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_appointments_status 
ON appointments(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_appointments_date 
ON appointments(tenant_id, appointment_date);

-- ========================================
-- STEP 2: CREATE DOCTOR_SCHEDULES TABLE
-- Manage doctor availability and time slots
-- ========================================

CREATE TABLE IF NOT EXISTS doctor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  available_slots TEXT[] DEFAULT ARRAY['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'],
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(tenant_id, doctor_id, available_date)
);

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_date 
ON doctor_schedules(tenant_id, doctor_id, available_date);

-- ========================================
-- STEP 3: CREATE PRESCRIPTIONS TABLE
-- Full prescription management with dosage tracking
-- ========================================

CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  medicine_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100),
  frequency VARCHAR(100),
  duration VARCHAR(100),
  instructions TEXT,
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient 
ON prescriptions(tenant_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor 
ON prescriptions(tenant_id, doctor_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_date 
ON prescriptions(tenant_id, created_at);

-- ========================================
-- STEP 4: ALTER CONSULTATIONS TABLE
-- Add SOAP notes (Subjective, Objective, Assessment, Plan)
-- ========================================

ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS soap_notes JSONB DEFAULT '{"subjective":"","objective":"","assessment":"","plan":""}';

-- ========================================
-- STEP 5: CREATE VITAL_SIGNS TABLE (OPTIONAL)
-- Track patient vital signs over time
-- ========================================

CREATE TABLE IF NOT EXISTS vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP DEFAULT now(),
  blood_pressure VARCHAR(20),
  heart_rate INTEGER,
  temperature DECIMAL(4, 2),
  respiratory_rate INTEGER,
  weight DECIMAL(6, 2),
  height DECIMAL(5, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Create index for patient vital sign lookups
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient 
ON vital_signs(tenant_id, patient_id, recorded_at DESC);

-- ========================================
-- ✅ ALL MIGRATIONS COMPLETE
-- ========================================
-- 
-- What was created/modified:
-- ✅ appointments table: Added status, reason_for_cancellation columns
-- ✅ doctor_schedules table: NEW - Doctor availability management
-- ✅ prescriptions table: NEW - Prescription lifecycle management
-- ✅ consultations table: Added soap_notes JSONB column
-- ✅ vital_signs table: NEW - Patient vital signs tracking
-- 
-- Indexes created: 8 (for fast queries)
-- Tables created: 3 (doctor_schedules, prescriptions, vital_signs)
-- Tables altered: 2 (appointments, consultations)
--
-- ========================================
