# Arogya Vision - Phase 1 Database Schema Updates

## Overview
This document contains all SQL migrations needed to support Phase 1 features in the Supabase dashboard.

## Required Changes

### 1. ALTER appointments TABLE

```sql
-- Add status and reason_for_cancellation columns to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS reason_for_cancellation TEXT;

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_appointments_status 
ON appointments(tenant_id, status);

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_appointments_date 
ON appointments(tenant_id, appointment_date);
```

### 2. CREATE doctor_schedules TABLE

```sql
-- Create doctor_schedules table for managing doctor availability
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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_doctor_schedules_date 
ON doctor_schedules(tenant_id, doctor_id, available_date);
```

### 3. CREATE prescriptions TABLE

```sql
-- Create prescriptions table
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient 
ON prescriptions(tenant_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor 
ON prescriptions(tenant_id, doctor_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_date 
ON prescriptions(tenant_id, created_at);
```

### 4. ALTER consultations TABLE

```sql
-- Add SOAP notes support to consultations table
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS soap_notes JSONB DEFAULT '{"subjective":"","objective":"","assessment":"","plan":""}';

-- Create index for faster text search in diagnosis
CREATE INDEX IF NOT EXISTS idx_consultations_diagnosis 
ON consultations USING GIN(to_tsvector('english', treatment_plan));
```

### 5. CREATE vital_signs TABLE (Optional but Recommended)

```sql
-- Create vital_signs table for patient vital sign tracking
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient 
ON vital_signs(tenant_id, patient_id, recorded_at DESC);
```

## Steps to Apply

1. **Open Supabase Dashboard** → Your Project
2. **Go to SQL Editor**
3. **Copy and paste ONE section at a time**
4. **Click "Run"** for each section
5. **Verify** each operation completes successfully

## Verification

After applying all migrations, verify in Supabase:

1. **Go to Database** → **Tables**
   - ✅ Verify `doctor_schedules` exists
   - ✅ Verify `prescriptions` exists
   - ✅ Verify `vital_signs` exists (if created)

2. **Go to Tables** → **appointments**
   - ✅ Verify `status` column exists
   - ✅ Verify `reason_for_cancellation` column exists

3. **Go to Tables** → **consultations**
   - ✅ Verify `soap_notes` column exists

## RLS Policies

All new tables inherit RLS from existing patterns. Verify policies are enabled:

```sql
-- Enable RLS on new tables
ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;

-- Create policies (if not auto-created)
CREATE POLICY "tenant_isolation" ON doctor_schedules
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY "tenant_isolation" ON prescriptions
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY "tenant_isolation" ON vital_signs
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

## Rollback Instructions

If something goes wrong, you can rollback:

```sql
-- Remove new tables
DROP TABLE IF EXISTS vital_signs CASCADE;
DROP TABLE IF EXISTS doctor_schedules CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;

-- Remove new columns
ALTER TABLE appointments DROP COLUMN IF EXISTS status CASCADE;
ALTER TABLE appointments DROP COLUMN IF EXISTS reason_for_cancellation CASCADE;

ALTER TABLE consultations DROP COLUMN IF EXISTS soap_notes CASCADE;
```

## Notes

- All timestamps use UTC
- All IDs are UUIDs (auto-generated)
- Tenant isolation ensures data security
- Indexes improve query performance
- JSONB for soap_notes allows flexible data structure
