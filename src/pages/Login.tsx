import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Settings, BookOpen, Calendar, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signUp, signIn, getUserRole, type UserRole } from '@/utils/auth';
import { supabase } from '@/integrations/supabase/client';
import loginBackground from '@/assets/login-background.jpg';

const Login = () => {
  const [loginType, setLoginType] = useState<UserRole | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [credentials, setCredentials] = useState({ 
    email: '', 
    password: '', 
    fullName: '',
    registerNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        getUserRole(session.user.id).then(role => {
          if (role) {
            navigate(`/${role}`);
          }
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const role = await getUserRole(session.user.id);
        if (role) {
          navigate(`/${role}`);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.email || !credentials.password) {
      toast({
        title: "Error",
        description: "Please enter email and password",
        variant: "destructive",
      });
      return;
    }

    if (isSignUp && !credentials.fullName) {
      toast({
        title: "Error",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    if (isSignUp && loginType !== 'admin' && !credentials.registerNumber) {
      toast({
        title: "Error",
        description: "Please enter your register number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up
        const { error } = await signUp({
          email: credentials.email,
          password: credentials.password,
          fullName: credentials.fullName,
          registerNumber: credentials.registerNumber || undefined,
          role: loginType!,
        });

        if (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Account created successfully! Please check your email to verify your account.",
          });
          // Clear form
          setCredentials({ email: '', password: '', fullName: '', registerNumber: '' });
          setIsSignUp(false);
        }
      } else {
        // Sign in
        const { error } = await signIn(credentials.email, credentials.password);

        if (error) {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: `Logged in successfully`,
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!loginType) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 relative"
        style={{
          backgroundImage: `url(${loginBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="w-full max-w-4xl relative z-10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-r from-primary to-accent rounded-full">
                <Calendar className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              College Timetable Generator
            </h1>
            <p className="text-white/90 text-lg">
              Automated scheduling system for academic excellence
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-primary/20"
                  onClick={() => setLoginType('faculty')}>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Faculty Login</CardTitle>
                <CardDescription className="text-base">
                  Generate and manage class timetables
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>Create Timetables</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Manage Subjects</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-green-500/20"
                  onClick={() => setLoginType('student')}>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-green-500" />
                </div>
                <CardTitle className="text-2xl">Student Login</CardTitle>
                <CardDescription className="text-base">
                  View your class timetable
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>View Timetable</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>Class Schedule</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-accent/20"
                  onClick={() => setLoginType('admin')}>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                  <Settings className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-2xl">Admin Login</CardTitle>
                <CardDescription className="text-base">
                  View and manage all generated timetables
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>View All Timetables</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>System Management</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${loginBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <Card className="w-full max-w-md shadow-lg relative z-10">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {loginType === 'faculty' ? 
              <GraduationCap className="h-8 w-8 text-primary" /> :
              loginType === 'admin' ?
              <Settings className="h-8 w-8 text-accent" /> :
              <User className="h-8 w-8 text-green-500" />
            }
          </div>
          <CardTitle className="text-2xl capitalize">
            {loginType} {isSignUp ? 'Sign Up' : 'Login'}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Create your account to get started' 
              : 'Enter your credentials to access the system'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={credentials.fullName}
                  onChange={(e) => setCredentials(prev => ({ ...prev, fullName: e.target.value }))}
                  disabled={loading}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">
                {loginType === 'admin' ? 'User ID' : 'Email'}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={loginType === 'admin' ? 'Enter your user ID' : 'Enter your email'}
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                disabled={loading}
              />
            </div>

            {isSignUp && loginType !== 'admin' && (
              <div className="space-y-2">
                <Label htmlFor="registerNumber">Register Number</Label>
                <Input
                  id="registerNumber"
                  type="text"
                  placeholder="Enter your register number"
                  value={credentials.registerNumber}
                  onChange={(e) => setCredentials(prev => ({ ...prev, registerNumber: e.target.value }))}
                  disabled={loading}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setLoginType(null);
                  setIsSignUp(false);
                  setCredentials({ email: '', password: '', fullName: '', registerNumber: '' });
                }}
                className="flex-1"
                disabled={loading}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Login'}
              </Button>
            </div>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setCredentials({ email: '', password: '', fullName: '', registerNumber: '' });
                }}
                disabled={loading}
              >
                {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign up"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;