import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, LogOut, GraduationCap, BookOpen, Pencil } from 'lucide-react';
import { Faculty, GeneratedTimetable, Subject } from '@/types/timetable';
import { generateTimetable } from '@/utils/timetableGenerator';
import { useToast } from '@/hooks/use-toast';
import TimetableDisplay from '@/components/TimetableDisplay';
import GlobalScheduleManager from '@/utils/globalScheduleManager';

const FacultyDashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<Set<string>>(new Set());
  const [newFaculty, setNewFaculty] = useState({ 
    name: '', 
    id: '', 
    subjects: [{ name: '', type: 'theory' as const, periodsPerWeek: 4, allocation: 'random' as const }] 
  });
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [editFacultyForm, setEditFacultyForm] = useState<{ name: string; subjects: Subject[] } | null>(null);
  const [className, setClassName] = useState('');
  const [year, setYear] = useState<number>(1);
  const [section, setSection] = useState('A');
  const [semester, setSemester] = useState<number>(1);
  const [generatedTimetable, setGeneratedTimetable] = useState<GeneratedTimetable | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleTimetableUpdate = (updatedTimetable: GeneratedTimetable) => {
    setGeneratedTimetable(updatedTimetable);
    const savedTimetables = localStorage.getItem('timetables');
    if (savedTimetables) {
      const timetables = JSON.parse(savedTimetables);
      const updatedTimetables = timetables.map((t: GeneratedTimetable) => 
        t.id === updatedTimetable.id ? updatedTimetable : t
      );
      localStorage.setItem('timetables', JSON.stringify(updatedTimetables));
    }
  };

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
      subjects: [...prev.subjects, { name: '', type: 'theory', periodsPerWeek: 4, allocation: 'random' }]
    }));
  };

  const removeSubject = (index: number) => {
    setNewFaculty(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }));
  };

  const updateSubject = (index: number, field: keyof Subject, value: any) => {
    setNewFaculty(prev => ({
      ...prev,
      subjects: prev.subjects.map((subject, i) => 
        i === index ? { ...subject, [field]: value } : subject
      )
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

    // Check for duplicate faculty ID
    const existingFaculty = faculties.find(f => f.id === newFaculty.id);
    if (existingFaculty) {
      toast({
        title: "Faculty ID Already Exists",
        description: `Faculty ID "${newFaculty.id}" is already allocated to ${existingFaculty.name}. Please use a different ID.`,
        variant: "destructive",
      });
      return;
    }

    const validSubjects = newFaculty.subjects.filter(subject => subject.name.trim() !== '');
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
    setSelectedFacultyIds(prev => new Set([...prev, faculty.id])); // Auto-select newly added faculty
    setNewFaculty({ name: '', id: '', subjects: [{ name: '', type: 'theory', periodsPerWeek: 4, allocation: 'random' }] });
    
    toast({
      title: "Success",
      description: "Faculty added successfully",
    });
  };

  const removeFaculty = (id: string) => {
    setFaculties(prev => prev.filter(faculty => faculty.id !== id));
    setSelectedFacultyIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const startEditFaculty = (faculty: Faculty) => {
    setEditingFaculty(faculty);
    setEditFacultyForm({
      name: faculty.name,
      subjects: [...faculty.subjects]
    });
  };

  const updateEditSubject = (index: number, field: keyof Subject, value: any) => {
    if (!editFacultyForm) return;
    setEditFacultyForm(prev => ({
      ...prev!,
      subjects: prev!.subjects.map((subject, i) => 
        i === index ? { ...subject, [field]: value } : subject
      )
    }));
  };

  const addEditSubject = () => {
    if (!editFacultyForm) return;
    setEditFacultyForm(prev => ({
      ...prev!,
      subjects: [...prev!.subjects, { name: '', type: 'theory', periodsPerWeek: 4, allocation: 'random' }]
    }));
  };

  const removeEditSubject = (index: number) => {
    if (!editFacultyForm) return;
    setEditFacultyForm(prev => ({
      ...prev!,
      subjects: prev!.subjects.filter((_, i) => i !== index)
    }));
  };

  const saveEditFaculty = () => {
    if (!editingFaculty || !editFacultyForm) return;

    const validSubjects = editFacultyForm.subjects.filter(subject => subject.name.trim() !== '');
    if (validSubjects.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one subject",
        variant: "destructive",
      });
      return;
    }

    setFaculties(prev => prev.map(f => 
      f.id === editingFaculty.id 
        ? { ...f, name: editFacultyForm.name, subjects: validSubjects }
        : f
    ));

    setEditingFaculty(null);
    setEditFacultyForm(null);

    toast({
      title: "Success",
      description: "Faculty updated successfully",
    });
  };

  const cancelEditFaculty = () => {
    setEditingFaculty(null);
    setEditFacultyForm(null);
  };

  const toggleFacultySelection = (id: string) => {
    setSelectedFacultyIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
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

    if (selectedFacultyIds.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one faculty member",
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

    const selectedFaculties = faculties.filter(f => selectedFacultyIds.has(f.id));
    const existingTimetables = JSON.parse(localStorage.getItem('timetables') || '[]');
    const timetable = generateTimetable(selectedFaculties, className, year, section, semester, user?.name || 'Faculty', existingTimetables);

    // Only save and show if timetable has entries
    if (timetable.entries.length === 0) {
      toast({
        title: "Warning",
        description: "Generated timetable is empty. Some faculty may already be assigned to other classes at these times.",
        variant: "destructive",
      });
      return;
    }
    
    setGeneratedTimetable(timetable);

    // Save to localStorage for admin view
    const updatedExistingTimetables = JSON.parse(localStorage.getItem('timetables') || '[]');
    localStorage.setItem('timetables', JSON.stringify([...updatedExistingTimetables, timetable]));

    toast({
      title: "Success",
      description: "Timetable generated successfully!",
    });
  };

  const clearGlobalSchedule = () => {
    const globalScheduleManager = GlobalScheduleManager.getInstance();
    globalScheduleManager.clearAll();
    
    // Also clear all saved timetables
    localStorage.removeItem('timetables');
    setGeneratedTimetable(null);
    
    toast({
      title: "Success",
      description: "All schedules cleared. You can now generate fresh timetables.",
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

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
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
                <div className="space-y-3">
                  {newFaculty.subjects.map((subject, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Subject name"
                          value={subject.name}
                          onChange={(e) => updateSubject(index, 'name', e.target.value)}
                          className="flex-1"
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
                      <div className="flex gap-2">
                        <select
                          className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          value={subject.type}
                          onChange={(e) => updateSubject(index, 'type', e.target.value as 'theory' | 'lab')}
                        >
                          <option value="theory">Theory</option>
                          <option value="lab">Lab</option>
                        </select>
                        <Input
                          type="number"
                          placeholder="Periods/week"
                          value={subject.periodsPerWeek}
                          onChange={(e) => updateSubject(index, 'periodsPerWeek', parseInt(e.target.value) || 4)}
                          className="w-32"
                          min={1}
                          max={8}
                        />
                      </div>
                      <div className="flex gap-2">
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                          value={subject.allocation}
                          onChange={(e) => updateSubject(index, 'allocation', e.target.value as 'continuous' | 'random')}
                        >
                          <option value="random">Random Allocation</option>
                          <option value="continuous">Continuous Allocation</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={addSubject} className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white border-none hover:from-green-600 hover:to-blue-600">
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

          {/* Class Details */}
          <Card className="bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-950 dark:to-pink-950 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="text-orange-700 dark:text-orange-300">Class Details</CardTitle>
              <CardDescription>
                Enter class information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year">Year</Label>
                  <select
                    id="year"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="section">Section</Label>
                  <select
                    id="section"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                    <option value="D">Section D</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="semester">Semester</Label>
                  <select
                    id="semester"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={semester}
                    onChange={(e) => setSemester(parseInt(e.target.value))}
                  >
                    {[1,2,3,4,5,6,7,8].map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="className">Class Name</Label>
                  <Input
                    id="className"
                    placeholder="e.g., CSE, IT, ECE"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Timetable */}
          <Card className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="text-green-700 dark:text-green-300">Generate Timetable</CardTitle>
              <CardDescription>
                Create a new timetable for your class
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              <div>
                <Label>Added Faculty ({faculties.length}) - {selectedFacultyIds.size} selected</Label>
                <div className="max-h-32 overflow-y-auto space-y-2 mt-2">
                  {faculties.map((faculty) => (
                    <div key={faculty.id} className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                      <Checkbox
                        checked={selectedFacultyIds.has(faculty.id)}
                        onCheckedChange={() => toggleFacultySelection(faculty.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{faculty.name}</p>
                        <div className="flex gap-1 flex-wrap">
                          {faculty.subjects.map((subject, idx) => (
                            <Badge 
                              key={idx} 
                              variant={subject.type === 'lab' ? 'default' : 'secondary'} 
                              className={`text-xs ${subject.type === 'lab' ? 'bg-purple-500 text-white' : ''}`}
                            >
                              {subject.name} ({subject.type}) - {subject.periodsPerWeek}p/w
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditFaculty(faculty)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFaculty(faculty.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={generateNewTimetable} 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-none shadow-lg"
                disabled={faculties.length === 0 || selectedFacultyIds.size === 0 || !className}
              >
                🎯 Generate Smart Timetable
              </Button>
              
              <Button 
                onClick={clearGlobalSchedule} 
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              >
                🗑️ Clear All Schedules & Start Fresh
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Display Generated Timetable */}
        {generatedTimetable && (
          <Card className="bg-gradient-to-br from-indigo-50 to-cyan-50 dark:from-indigo-950 dark:to-cyan-950 border-indigo-200 dark:border-indigo-800">
            <CardHeader>
              <CardTitle className="text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                📚 Generated Timetable - {generatedTimetable.className} 
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black">
                  Year {generatedTimetable.year} | Sec {generatedTimetable.section} | Sem {generatedTimetable.semester}
                </Badge>
              </CardTitle>
              <CardDescription>
                Created on {generatedTimetable.createdAt.toLocaleDateString()} by {generatedTimetable.createdBy}
              </CardDescription>
            </CardHeader>
            <CardContent>
          <TimetableDisplay 
            timetable={generatedTimetable} 
            onDelete={() => setGeneratedTimetable(null)}
            onUpdate={handleTimetableUpdate}
            availableFaculties={faculties}
          />
            </CardContent>
          </Card>
        )}

        {/* Edit Faculty Dialog */}
        <Dialog open={!!editingFaculty} onOpenChange={(open) => !open && cancelEditFaculty()}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Faculty Member</DialogTitle>
            </DialogHeader>
            {editFacultyForm && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editFacultyName">Faculty Name</Label>
                  <Input
                    id="editFacultyName"
                    value={editFacultyForm.name}
                    onChange={(e) => setEditFacultyForm(prev => ({ ...prev!, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Subjects</Label>
                  <div className="space-y-3">
                    {editFacultyForm.subjects.map((subject, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Subject name"
                            value={subject.name}
                            onChange={(e) => updateEditSubject(index, 'name', e.target.value)}
                            className="flex-1"
                          />
                          {editFacultyForm.subjects.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeEditSubject(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <select
                            className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            value={subject.type}
                            onChange={(e) => updateEditSubject(index, 'type', e.target.value as 'theory' | 'lab')}
                          >
                            <option value="theory">Theory</option>
                            <option value="lab">Lab</option>
                          </select>
                          <Input
                            type="number"
                            placeholder="Periods/week"
                            value={subject.periodsPerWeek}
                            onChange={(e) => updateEditSubject(index, 'periodsPerWeek', parseInt(e.target.value) || 4)}
                            className="w-32"
                            min={1}
                            max={8}
                          />
                        </div>
                        <div className="flex gap-2">
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            value={subject.allocation}
                            onChange={(e) => updateEditSubject(index, 'allocation', e.target.value as 'continuous' | 'random')}
                          >
                            <option value="random">Random Allocation</option>
                            <option value="continuous">Continuous Allocation</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addEditSubject} className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white border-none hover:from-green-600 hover:to-blue-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Subject
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={cancelEditFaculty}>Cancel</Button>
              <Button onClick={saveEditFaculty}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default FacultyDashboard;