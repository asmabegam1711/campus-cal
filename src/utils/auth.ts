import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'faculty' | 'student';

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  registerNumber?: string;
  role: UserRole;
}

export const signUp = async (data: SignUpData) => {
  try {
    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: data.fullName,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user returned from signup');

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: data.fullName,
        username: data.email.split('@')[0],
        register_number: data.registerNumber || null,
      });

    if (profileError) throw profileError;

    // Assign role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: data.role,
      });

    if (roleError) throw roleError;

    return { user: authData.user, error: null };
  } catch (error: any) {
    return { user: null, error };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return { user: data.user, session: data.session, error: null };
  } catch (error: any) {
    return { user: null, session: null, error };
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getUserRole = async (userId: string): Promise<UserRole | null> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return data?.role as UserRole;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
};
