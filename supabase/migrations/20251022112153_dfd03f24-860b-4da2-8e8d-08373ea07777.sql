-- Update app_role enum to include all needed roles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'faculty', 'student');
  ELSE
    -- Add new values if they don't exist
    BEGIN
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'faculty';
      ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'student';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Add register_number to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS register_number TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_register_number ON public.profiles(register_number);

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Users can insert their own profile during signup" ON public.profiles;

CREATE POLICY "Users can insert their own profile during signup"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);