import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogOut, Download, User, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TimetableDisplay from '@/components/TimetableDisplay';

interface StudentData {
  year: number;
  section: string;
  semester: number;
  department: string;
}

const StudentDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [studentData, setStudentData] = useState<StudentData>({
    year: 1,
    section: '',
    semester: 1,
    department: ''
  });
  const [selectedTimetable, setSelectedTimetable] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'student') {
      navigate('/');
      return;
    }
    
    setUser(parsedUser);
  }, [navigate]);

  const findTimetable = () => {
    if (!studentData.section || !studentData.department) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Try to find existing timetable in localStorage
    const allTimetables = JSON.parse(localStorage.getItem('timetables') || '[]');
    console.log('Available timetables:', allTimetables);
    console.log('Searching for:', studentData);
    
    const matchingTimetable = allTimetables.find((tt: any) => {
      const yearMatch = tt.year === studentData.year;
      const sectionMatch = tt.section.toLowerCase().trim() === studentData.section.toLowerCase().trim();
      const semesterMatch = tt.semester === studentData.semester;
      
      // More flexible department matching
      const dept = studentData.department.toLowerCase().trim();
      const className = tt.className.toLowerCase().trim();
      const deptMatch = className.includes(dept) || 
                       dept.includes(className) ||
                       // Common abbreviation matching
                       (dept.includes('computer') && className.includes('cse')) ||
                       (dept.includes('cse') && className.includes('computer')) ||
                       (dept.includes('information') && className.includes('it')) ||
                       (dept.includes('it') && className.includes('information')) ||
                       (dept.includes('electronic') && className.includes('ece')) ||
                       (dept.includes('ece') && className.includes('electronic')) ||
                       (dept.includes('mechanical') && className.includes('mech')) ||
                       (dept.includes('mech') && className.includes('mechanical')) ||
                       (dept.includes('civil') && className.includes('ce')) ||
                       (dept.includes('ce') && className.includes('civil'));
      
      console.log(`Checking timetable: ${tt.className}, Year: ${tt.year}, Section: ${tt.section}, Semester: ${tt.semester}`);
      console.log(`Matches - Year: ${yearMatch}, Section: ${sectionMatch}, Semester: ${semesterMatch}, Dept: ${deptMatch}`);
      
      return yearMatch && sectionMatch && semesterMatch && deptMatch;
    });

    if (matchingTimetable) {
      setSelectedTimetable(matchingTimetable);
      toast({
        title: "🎉 Timetable Found!",
        description: `Found timetable for ${matchingTimetable.className} Year ${studentData.year} Section ${studentData.section}`,
      });
    } else {
      toast({
        title: "❌ No Timetable Found",
        description: "No timetable exists for the specified class details. Please contact your faculty or verify the information entered.",
        variant: "destructive",
      });
      setSelectedTimetable(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gradient-start via-gradient-middle to-gradient-end relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-accent/20 to-primary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl animate-spin-slow"></div>
      </div>

      {/* Header */}
      <div className="relative bg-card/90 backdrop-blur-xl shadow-2xl border-b border-gradient-primary/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="relative p-3 bg-gradient-primary rounded-xl shadow-glow">
                <User className="h-7 w-7 text-white" />
                <div className="absolute inset-0 bg-gradient-primary rounded-xl blur animate-pulse opacity-75"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  ✨ Student Portal
                </h1>
                <p className="text-muted-foreground font-medium">Welcome back, {user.name} 👋</p>
              </div>
            </div>
            <Button 
              onClick={logout} 
              variant="outline" 
              className="gap-2 bg-card/80 backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="relative container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Student Info & Class Details */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl shadow-2xl border-gradient-primary/20 hover:shadow-glow transition-all duration-500 hover:-translate-y-1">
              <CardHeader className="bg-gradient-subtle rounded-t-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-primary/5"></div>
                <div className="relative flex items-center gap-3">
                  <div className="p-2 bg-gradient-primary/30 rounded-full backdrop-blur-sm">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-primary font-bold">📚 Student Information</CardTitle>
                    <CardDescription className="text-muted-foreground/80">Your academic details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="p-4 bg-gradient-subtle rounded-xl border border-primary/10">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">👤 Name:</span>
                      <span className="font-bold text-foreground">{user.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-medium">🆔 Register No:</span>
                      <span className="font-bold text-foreground">{user.registerNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-semibold text-foreground">🏫 Department</Label>
                    <Input
                      id="department"
                      placeholder="e.g., Computer Science, CSE, IT"
                      value={studentData.department}
                      onChange={(e) => setStudentData(prev => ({ ...prev, department: e.target.value }))}
                      className="border-primary/30 focus:border-primary bg-card/50 backdrop-blur-sm transition-all duration-300 focus:shadow-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="year" className="text-sm font-semibold text-foreground">📅 Year</Label>
                      <Select value={studentData.year.toString()} onValueChange={(value) => setStudentData(prev => ({ ...prev, year: parseInt(value) }))}>
                        <SelectTrigger className="border-primary/30 focus:border-primary bg-card/50 backdrop-blur-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1st Year</SelectItem>
                          <SelectItem value="2">2nd Year</SelectItem>
                          <SelectItem value="3">3rd Year</SelectItem>
                          <SelectItem value="4">4th Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="semester" className="text-sm font-semibold text-foreground">📖 Semester</Label>
                      <Select value={studentData.semester.toString()} onValueChange={(value) => setStudentData(prev => ({ ...prev, semester: parseInt(value) }))}>
                        <SelectTrigger className="border-primary/30 focus:border-primary bg-card/50 backdrop-blur-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Semester 1</SelectItem>
                          <SelectItem value="2">Semester 2</SelectItem>
                          <SelectItem value="3">Semester 3</SelectItem>
                          <SelectItem value="4">Semester 4</SelectItem>
                          <SelectItem value="5">Semester 5</SelectItem>
                          <SelectItem value="6">Semester 6</SelectItem>
                          <SelectItem value="7">Semester 7</SelectItem>
                          <SelectItem value="8">Semester 8</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="section" className="text-sm font-semibold text-foreground">🏷️ Section</Label>
                    <Input
                      id="section"
                      placeholder="e.g., A, B, C"
                      value={studentData.section}
                      onChange={(e) => setStudentData(prev => ({ ...prev, section: e.target.value.toUpperCase() }))}
                      className="border-primary/30 focus:border-primary bg-card/50 backdrop-blur-sm transition-all duration-300 focus:shadow-lg"
                      maxLength={1}
                    />
                  </div>

                  <Button 
                    onClick={findTimetable} 
                    className="w-full bg-gradient-primary hover:opacity-90 shadow-glow hover:shadow-xl transition-all duration-300 font-bold text-lg py-3 transform hover:-translate-y-0.5"
                  >
                    🔍 View My Timetable
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timetable Display */}
          <div className="lg:col-span-2">
            {selectedTimetable ? (
              <Card className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-xl shadow-2xl border-accent/30 hover:shadow-glow transition-all duration-500">
                <CardHeader className="bg-gradient-subtle rounded-t-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-primary/5"></div>
                  <div className="relative flex justify-between items-start">
                    <div>
                      <CardTitle className="text-accent font-bold text-xl">📋 Class Timetable</CardTitle>
                      <CardDescription className="text-lg font-medium">
                        🎓 {selectedTimetable.className} - Year {selectedTimetable.year} Section {selectedTimetable.section} (Semester {selectedTimetable.semester})
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <TimetableDisplay timetable={selectedTimetable} />
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-br from-card/80 to-muted/30 backdrop-blur-xl shadow-2xl border-dashed border-primary/40 hover:border-primary/60 transition-all duration-500 group">
                <CardContent className="p-12 text-center">
                  <div className="space-y-6">
                    <div className="relative">
                      <div className="p-6 bg-gradient-primary/20 rounded-full w-fit mx-auto backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
                        <GraduationCap className="h-16 w-16 text-primary" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-primary/10 rounded-full blur-xl animate-pulse"></div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground mb-3 bg-gradient-primary bg-clip-text text-transparent">
                        🎯 No Timetable Selected
                      </h3>
                      <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
                        Enter your class details above and click <span className="font-semibold text-primary">"View My Timetable"</span> to discover your personalized schedule ✨
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;