import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'faculty' | 'student';

export const signUp = async (
  email: string, 
  password: string, 
  username: string,
  fullName: string,
  role: UserRole
) => {
  const redirectUrl = `${window.location.origin}/`;
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        username,
        full_name: fullName,
      }
    }
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error("No user data returned");

  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      username,
      full_name: fullName,
    });

  if (profileError) throw profileError;

  // Create role (only admins can do this, so for now we'll try and catch the error)
  try {
    await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role,
      });
  } catch (error) {
    console.log("Role assignment will be done by admin");
  }

  return authData;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getUserRole = async (userId: string): Promise<UserRole | null> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user role:", error);
    return null;
  }

  return data?.role as UserRole | null;
};
