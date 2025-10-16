import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { GraduationCap, User, UserCog, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signIn, signUp, getUserRole, type UserRole } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import collegeHero from "@/assets/college-hero.jpg";

type AuthMode = 'signin' | 'signup';

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loginType, setLoginType] = useState<UserRole | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    username: "",
    fullName: "",
  });

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const role = await getUserRole(session.user.id);
        if (role) {
          navigateToRole(role);
        }
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const role = await getUserRole(session.user.id);
        if (role) {
          navigateToRole(role);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigateToRole = (role: UserRole) => {
    switch (role) {
      case "faculty":
        navigate("/faculty");
        break;
      case "admin":
        navigate("/admin");
        break;
      case "student":
        navigate("/student");
        break;
      default:
        toast({
          title: "Role Assignment Pending",
          description: "Please wait for an administrator to assign your role.",
          variant: "destructive",
        });
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginType) {
      toast({
        title: "Error",
        description: "Please select a role first",
        variant: "destructive",
      });
      return;
    }

    if (!credentials.email || !credentials.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (authMode === 'signup' && (!credentials.username || !credentials.fullName)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (authMode === 'signin') {
        await signIn(credentials.email, credentials.password);
        toast({
          title: "Success",
          description: "Logged in successfully",
        });
      } else {
        await signUp(
          credentials.email,
          credentials.password,
          credentials.username,
          credentials.fullName,
          loginType
        );
        toast({
          title: "Success",
          description: "Account created successfully! Please sign in.",
        });
        setAuthMode('signin');
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast({
        title: "Error",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const roleCards = [
    {
      type: "faculty" as UserRole,
      icon: GraduationCap,
      title: "Faculty Login",
      description: "Access your teaching schedule and class management",
    },
    {
      type: "student" as UserRole,
      icon: User,
      title: "Student Login",
      description: "View your personalized class timetable",
    },
    {
      type: "admin" as UserRole,
      icon: UserCog,
      title: "Admin Login",
      description: "Manage schedules, faculty, and system settings",
    },
  ];

  if (!loginType) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Hero Section with College Image */}
        <div 
          className="relative min-h-[60vh] bg-cover bg-center"
          style={{ backgroundImage: `url(${collegeHero})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/30" />
          <div className="relative h-full flex items-center justify-center px-4 py-16">
            <div className="text-center text-white max-w-3xl">
              <h1 className="text-5xl md:text-6xl font-bold mb-4">College Timetable System</h1>
              <p className="text-xl md:text-2xl">Efficient scheduling for modern education</p>
            </div>
          </div>
        </div>

        {/* Role Selection */}
        <div className="flex-1 flex items-center justify-center p-8 bg-background">
          <div className="w-full max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-8">Select Your Role</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {roleCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card
                    key={card.type}
                    className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                    onClick={() => setLoginType(card.type)}
                  >
                    <CardHeader>
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle>{card.title}</CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            className="w-fit mb-4"
            onClick={() => {
              setLoginType(null);
              setAuthMode('signin');
              setCredentials({ email: "", password: "", username: "", fullName: "" });
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <CardTitle className="text-2xl">
            {authMode === 'signin' ? 'Sign In' : 'Sign Up'} as {loginType.charAt(0).toUpperCase() + loginType.slice(1)}
          </CardTitle>
          <CardDescription>
            {authMode === 'signin' 
              ? 'Enter your credentials to access your dashboard'
              : 'Create a new account to get started'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={credentials.username}
                    onChange={(e) =>
                      setCredentials({ ...credentials, username: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={credentials.fullName}
                    onChange={(e) =>
                      setCredentials({ ...credentials, fullName: e.target.value })
                    }
                    required
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={credentials.email}
                onChange={(e) =>
                  setCredentials({ ...credentials, email: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
            </Button>
            <div className="text-center text-sm">
              {authMode === 'signin' ? (
                <span>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className="text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className="text-primary hover:underline"
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;