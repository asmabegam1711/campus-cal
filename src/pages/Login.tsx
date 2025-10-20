import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, Settings, BookOpen, Calendar, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [loginType, setLoginType] = useState<'faculty' | 'admin' | 'student' | null>(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    // Simple authentication (in real app, use proper auth)
    if (loginType === 'faculty') {
      localStorage.setItem('user', JSON.stringify({
        id: credentials.username,
        name: credentials.username,
        role: 'faculty'
      }));
      navigate('/faculty');
    } else if (loginType === 'admin') {
      localStorage.setItem('user', JSON.stringify({
        id: credentials.username,
        name: credentials.username,
        role: 'admin'
      }));
      navigate('/admin');
    } else if (loginType === 'student') {
      localStorage.setItem('user', JSON.stringify({
        id: credentials.username,
        registerNumber: credentials.password, // Using password field as register number
        name: credentials.username,
        role: 'student'
      }));
      navigate('/student');
    }

    toast({
      title: "Success",
      description: `Logged in as ${loginType}`,
    });
  };

  if (!loginType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-r from-primary to-accent rounded-full">
                <Calendar className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              College Timetable Generator
            </h1>
            <p className="text-muted-foreground text-lg">
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {loginType === 'faculty' ? 
              <GraduationCap className="h-8 w-8 text-primary" /> :
              loginType === 'admin' ?
              <Settings className="h-8 w-8 text-accent" /> :
              <User className="h-8 w-8 text-green-500" />
            }
          </div>
          <CardTitle className="text-2xl capitalize">{loginType} Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {loginType === 'student' ? 'Register Number' : 'Password'}
              </Label>
              <Input
                id="password"
                type={loginType === 'student' ? 'text' : 'password'}
                placeholder={loginType === 'student' ? 'Enter your register number' : 'Enter your password'}
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setLoginType(null)}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" className="flex-1">
                Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;