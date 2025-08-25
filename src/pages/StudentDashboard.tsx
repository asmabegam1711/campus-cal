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
    const allTimetables = JSON.parse(localStorage.getItem('allTimetables') || '[]');
    const matchingTimetable = allTimetables.find((tt: any) => 
      tt.year === studentData.year &&
      tt.section.toLowerCase() === studentData.section.toLowerCase() &&
      tt.semester === studentData.semester &&
      tt.className.toLowerCase().includes(studentData.department.toLowerCase())
    );

    if (matchingTimetable) {
      setSelectedTimetable(matchingTimetable);
      toast({
        title: "Timetable Found",
        description: `Found timetable for ${studentData.department} Year ${studentData.year} Section ${studentData.section}`,
      });
    } else {
      toast({
        title: "No Timetable Found",
        description: "No timetable exists for the specified class details. Contact your faculty.",
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/10">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm shadow-lg border-b border-primary/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-accent to-primary rounded-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Student Portal
                </h1>
                <p className="text-muted-foreground">Welcome, {user.name}</p>
              </div>
            </div>
            <Button onClick={logout} variant="outline" className="gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Student Info & Class Details */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-to-br from-card to-card/80 shadow-elevated border-primary/10">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-t-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-full">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-primary">Student Information</CardTitle>
                    <CardDescription>Your academic details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{user.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Register No:</span>
                      <span className="font-medium">{user.registerNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      placeholder="e.g., Computer Science"
                      value={studentData.department}
                      onChange={(e) => setStudentData(prev => ({ ...prev, department: e.target.value }))}
                      className="border-primary/20 focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Select value={studentData.year.toString()} onValueChange={(value) => setStudentData(prev => ({ ...prev, year: parseInt(value) }))}>
                        <SelectTrigger className="border-primary/20 focus:border-primary">
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
                      <Label htmlFor="semester">Semester</Label>
                      <Select value={studentData.semester.toString()} onValueChange={(value) => setStudentData(prev => ({ ...prev, semester: parseInt(value) }))}>
                        <SelectTrigger className="border-primary/20 focus:border-primary">
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
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      placeholder="e.g., A"
                      value={studentData.section}
                      onChange={(e) => setStudentData(prev => ({ ...prev, section: e.target.value.toUpperCase() }))}
                      className="border-primary/20 focus:border-primary"
                      maxLength={1}
                    />
                  </div>

                  <Button 
                    onClick={findTimetable} 
                    className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg"
                  >
                    View My Timetable
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timetable Display */}
          <div className="lg:col-span-2">
            {selectedTimetable ? (
              <Card className="bg-gradient-to-br from-card to-card/80 shadow-elevated border-accent/20">
                <CardHeader className="bg-gradient-to-r from-accent/10 to-primary/10">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-accent">Class Timetable</CardTitle>
                      <CardDescription>
                        {selectedTimetable.className} - Year {selectedTimetable.year} Section {selectedTimetable.section} (Semester {selectedTimetable.semester})
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <TimetableDisplay timetable={selectedTimetable} />
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-br from-card to-muted/20 shadow-lg border-dashed border-primary/30">
                <CardContent className="p-12 text-center">
                  <div className="space-y-4">
                    <div className="p-4 bg-primary/10 rounded-full w-fit mx-auto">
                      <GraduationCap className="h-12 w-12 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">No Timetable Selected</h3>
                      <p className="text-muted-foreground">
                        Enter your class details and click "View My Timetable" to see your schedule
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