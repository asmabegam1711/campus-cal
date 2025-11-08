-- Create faculty_members table to store faculty names and IDs
CREATE TABLE public.faculty_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id TEXT NOT NULL UNIQUE,
  faculty_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faculty_members ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all faculty members
CREATE POLICY "Anyone can view faculty members"
ON public.faculty_members
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert faculty members
CREATE POLICY "Authenticated users can insert faculty members"
ON public.faculty_members
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for faster name lookups
CREATE INDEX idx_faculty_name ON public.faculty_members(faculty_name);

-- Create trigger for updated_at
CREATE TRIGGER update_faculty_members_updated_at
BEFORE UPDATE ON public.faculty_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();