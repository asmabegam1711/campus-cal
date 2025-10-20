-- Drop the existing trigger and function that auto-assigns student role
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_profile();

-- Create a new function that handles profile creation without auto-assigning roles
-- Roles will be assigned during signup based on user selection
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Just return the new profile without inserting any roles
  -- Roles will be handled by the application during signup
  RETURN NEW;
END;
$$;

-- Create trigger for any future profile-related logic
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();