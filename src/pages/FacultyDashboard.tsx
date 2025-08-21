import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, LogOut, GraduationCap, BookOpen } from 'lucide-react';
import { Faculty, GeneratedTimetable } from '@/types/timetable';
import { generateTimetable } from '@/utils/timetableGenerator';
import { useToast } from '@/hooks/use-toast';
import TimetableDisplay from '@/components/TimetableDisplay';

const FacultyDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [newFaculty, setNewFaculty] = useState({ name: '', id: '', subjects: [''] });
  const [className, setClassName] = useState('');
  const [generatedTimetable, setGeneratedTimetable] = useState<GeneratedTimetable | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'faculty') {
      navigate('/');
      return;
    }
    setUser(parsedUser);
  }, [navigate]);

  const addSubject = () => {
    setNewFaculty(prev => ({
      ...prev,
      subjects: [...prev.subjects, '']
    }));
  };

  const removeSubject = (index: number) => {
    setNewFaculty(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }));
  };

  const updateSubject = (index: number, value: string) => {
    setNewFaculty(prev => ({
      ...prev,
      subjects: prev.subjects.map((subject, i) => i === index ? value : subject)
    }));
  };

  const addFaculty = () => {
    if (!newFaculty.name || !newFaculty.id) {
      toast({
        title: "Error",
        description: "Please enter faculty name and ID",
        variant: "destructive",
      });
      return;
    }

    const validSubjects = newFaculty.subjects.filter(subject => subject.trim() !== '');
    if (validSubjects.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one subject",
        variant: "destructive",
      });
      return;
    }

    const faculty: Faculty = {
      id: newFaculty.id,
      name: newFaculty.name,
      subjects: validSubjects
    };

    setFaculties(prev => [...prev, faculty]);
    setNewFaculty({ name: '', id: '', subjects: [''] });
    
    toast({
      title: "Success",
      description: "Faculty added successfully",
    });
  };

  const removeFaculty = (id: string) => {
    setFaculties(prev => prev.filter(faculty => faculty.id !== id));
  };

  const generateNewTimetable = () => {
    if (faculties.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one faculty member",
        variant: "destructive",
      });
      return;
    }

    if (!className) {
      toast({
        title: "Error",
        description: "Please enter class name",
        variant: "destructive",
      });
      return;
    }

    const timetable = generateTimetable(faculties, className, user?.name || 'Faculty');
    setGeneratedTimetable(timetable);

    // Save to localStorage for admin view
    const existingTimetables = JSON.parse(localStorage.getItem('timetables') || '[]');
    localStorage.setItem('timetables', JSON.stringify([...existingTimetables, timetable]));

    toast({
      title: "Success",
      description: "Timetable generated successfully!",
    });
  };

  const logout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Faculty Dashboard</h1>
              <p className="text-muted-foreground">Welcome, {user.name}</p>
            </div>
          </div>
          <Button onClick={logout} variant="outline" className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Faculty Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Add Faculty Member
              </CardTitle>
              <CardDescription>
                Add faculty members with their subjects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="facultyName">Faculty Name</Label>
                  <Input
                    id="facultyName"
                    placeholder="Enter name"
                    value={newFaculty.name}
                    onChange={(e) => setNewFaculty(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="facultyId">Faculty ID</Label>
                  <Input
                    id="facultyId"
                    placeholder="Enter ID"
                    value={newFaculty.id}
                    onChange={(e) => setNewFaculty(prev => ({ ...prev, id: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Subjects</Label>
                <div className="space-y-2">
                  {newFaculty.subjects.map((subject, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Enter subject name"
                        value={subject}
                        onChange={(e) => updateSubject(index, e.target.value)}
                      />
                      {newFaculty.subjects.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeSubject(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addSubject} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subject
                  </Button>
                </div>
              </div>

              <Button onClick={addFaculty} className="w-full">
                Add Faculty
              </Button>
            </CardContent>
          </Card>

          {/* Generate Timetable */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Timetable</CardTitle>
              <CardDescription>
                Create a new timetable for your class
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="className">Class Name</Label>
                <Input
                  id="className"
                  placeholder="Enter class name (e.g., CSE-A, IT-B)"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>

              <div>
                <Label>Added Faculty ({faculties.length})</Label>
                <div className="max-h-32 overflow-y-auto space-y-2 mt-2">
                  {faculties.map((faculty) => (
                    <div key={faculty.id} className="flex justify-between items-center p-2 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{faculty.name}</p>
                        <div className="flex gap-1 flex-wrap">
                          {faculty.subjects.map((subject, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFaculty(faculty.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={generateNewTimetable} 
                className="w-full"
                disabled={faculties.length === 0 || !className}
              >
                Generate Timetable
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Display Generated Timetable */}
        {generatedTimetable && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Timetable - {generatedTimetable.className}</CardTitle>
              <CardDescription>
                Created on {generatedTimetable.createdAt.toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimetableDisplay timetable={generatedTimetable} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FacultyDashboard;