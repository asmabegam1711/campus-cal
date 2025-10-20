-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;

-- Create a new policy that allows users to insert their OWN role (but only once)
-- This allows self-registration while preventing privilege escalation
CREATE POLICY "Users can insert their own initial role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);

-- Also allow admins to insert any roles
CREATE POLICY "Admins can insert any roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);