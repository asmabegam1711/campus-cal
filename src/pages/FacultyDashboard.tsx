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
  // Map of facultyId -> Set of selected subject indices
  const [selectedSubjects, setSelectedSubjects] = useState<Map<string, Set<number>>>(new Map());
  const [newFaculty, setNewFaculty] = useState<{ name: string; id: string; subjects: Subject[] }>({ 
    name: '', 
    id: '', 
    subjects: [{ name: '', type: 'theory', periodsPerWeek: 4, allocation: 'random' }] 
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
      subjects: [...prev.subjects, { name: '', type: 'theory' as const, periodsPerWeek: 4, allocation: 'random' as const }]
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
    // Auto-select all subjects for newly added faculty
    setSelectedSubjects(prev => {
      const newMap = new Map(prev);
      newMap.set(faculty.id, new Set(validSubjects.map((_, idx) => idx)));
      return newMap;
    });
    setNewFaculty({ name: '', id: '', subjects: [{ name: '', type: 'theory' as const, periodsPerWeek: 4, allocation: 'random' as const }] });
    
    toast({
      title: "Success",
      description: "Faculty added successfully",
    });
  };

  const removeFaculty = (id: string) => {
    setFaculties(prev => prev.filter(faculty => faculty.id !== id));
    setSelectedSubjects(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
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
      subjects: [...prev!.subjects, { name: '', type: 'theory' as const, periodsPerWeek: 4, allocation: 'random' as const }]
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

  const toggleSubjectSelection = (facultyId: string, subjectIndex: number) => {
    setSelectedSubjects(prev => {
      const newMap = new Map(prev);
      const facultySubjects = newMap.get(facultyId) || new Set<number>();
      const newSet = new Set(facultySubjects);
      if (newSet.has(subjectIndex)) {
        newSet.delete(subjectIndex);
      } else {
        newSet.add(subjectIndex);
      }
      if (newSet.size === 0) {
        newMap.delete(facultyId);
      } else {
        newMap.set(facultyId, newSet);
      }
      return newMap;
    });
  };

  const toggleAllFacultySubjects = (facultyId: string, subjects: Subject[]) => {
    setSelectedSubjects(prev => {
      const newMap = new Map(prev);
      const currentSelected = newMap.get(facultyId);
      if (currentSelected && currentSelected.size === subjects.length) {
        // All selected, so deselect all
        newMap.delete(facultyId);
      } else {
        // Select all subjects
        newMap.set(facultyId, new Set(subjects.map((_, idx) => idx)));
      }
      return newMap;
    });
  };

  const getSelectedSubjectCount = () => {
    let count = 0;
    selectedSubjects.forEach(subjects => count += subjects.size);
    return count;
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

    if (selectedSubjects.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one subject",
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

    // Filter faculties and only include selected subjects
    const selectedFaculties = faculties
      .filter(f => selectedSubjects.has(f.id))
      .map(f => {
        const selectedIndices = selectedSubjects.get(f.id)!;
        return {
          ...f,
          subjects: f.subjects.filter((_, idx) => selectedIndices.has(idx))
        };
      });
    const timetable = generateTimetable(selectedFaculties, className, year, section, semester, user?.name || 'Faculty');

    // Only save and show if timetable has entries
    if (timetable.entries.length === 0) {
      toast({
        title: "Generation Failed",
        description: "Could not generate timetable. All faculty members have conflicts with other sections at every available time slot.",
        variant: "destructive",
      });
      return;
    }

    // Check for warnings (partial allocation failures)
    if (timetable.warnings && timetable.warnings.length > 0) {
      const warningMessages = timetable.warnings.map(w => 
        `• ${w.subjectName}: Only ${w.allocatedPeriods}/${w.requestedPeriods} periods allocated (${w.facultyName})`
      ).join('\n');
      
      toast({
        title: "⚠️ Faculty Conflicts Detected",
        description: `Some subjects could not be fully allocated due to faculty conflicts across sections:\n${warningMessages}`,
        variant: "destructive",
        duration: 10000, // Show longer for important warning
      });
    }
    
    setGeneratedTimetable(timetable);

    // Save to localStorage for admin view
    const existingTimetables = JSON.parse(localStorage.getItem('timetables') || '[]');
    localStorage.setItem('timetables', JSON.stringify([...existingTimetables, timetable]));

    toast({
      title: "Success",
      description: timetable.warnings?.length 
        ? "Timetable generated with some conflicts (see warning above)"
        : "Timetable generated successfully!",
    });
  };

  const clearGlobalSchedule = () => {
    const globalScheduleManager = GlobalScheduleManager.getInstance();
    globalScheduleManager.clearAll();
    
    // Only clear the currently displayed timetable, NOT saved ones in Admin Dashboard
    setGeneratedTimetable(null);
    
    toast({
      title: "Success",
      description: "Current view cleared. Saved timetables are still available in Admin Dashboard.",
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
                      {subject.allocation === 'continuous' && subject.type === 'theory' && (
                        <div className="flex gap-2 items-center">
                          <Label className="text-xs whitespace-nowrap">Continuous Periods:</Label>
                          <Input
                            type="number"
                            placeholder="Count"
                            value={subject.continuousPeriods || subject.periodsPerWeek}
                            onChange={(e) => updateSubject(index, 'continuousPeriods', parseInt(e.target.value) || 2)}
                            className="w-20"
                            min={2}
                            max={subject.periodsPerWeek}
                          />
                          <span className="text-xs text-muted-foreground">(placed on same day)</span>
                        </div>
                      )}
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
                <Label>Added Faculty ({faculties.length}) - {getSelectedSubjectCount()} subjects selected</Label>
                <div className="max-h-48 overflow-y-auto space-y-2 mt-2">
                  {faculties.map((faculty) => {
                    const facultySelectedSubjects = selectedSubjects.get(faculty.id) || new Set<number>();
                    const allSelected = facultySelectedSubjects.size === faculty.subjects.length;
                    return (
                      <div key={faculty.id} className="p-2 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={() => toggleAllFacultySubjects(faculty.id, faculty.subjects)}
                          />
                          <p className="font-medium flex-1">{faculty.name} <span className="text-muted-foreground text-sm">({faculty.id})</span></p>
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
                        <div className="ml-6 flex flex-col gap-1">
                          {faculty.subjects.map((subject, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Checkbox
                                checked={facultySelectedSubjects.has(idx)}
                                onCheckedChange={() => toggleSubjectSelection(faculty.id, idx)}
                              />
                              <Badge 
                                variant={subject.type === 'lab' ? 'default' : 'secondary'} 
                                className={`text-xs cursor-pointer ${subject.type === 'lab' ? 'bg-purple-500 text-white' : ''} ${!facultySelectedSubjects.has(idx) ? 'opacity-50' : ''}`}
                                onClick={() => toggleSubjectSelection(faculty.id, idx)}
                              >
                                {subject.name} ({subject.type}) - {subject.periodsPerWeek}p/w
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button 
                onClick={generateNewTimetable} 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-none shadow-lg"
                disabled={faculties.length === 0 || selectedSubjects.size === 0 || !className}
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
                        {subject.allocation === 'continuous' && subject.type === 'theory' && (
                          <div className="flex gap-2 items-center">
                            <Label className="text-xs whitespace-nowrap">Continuous Periods:</Label>
                            <Input
                              type="number"
                              placeholder="Count"
                              value={subject.continuousPeriods || subject.periodsPerWeek}
                              onChange={(e) => updateEditSubject(index, 'continuousPeriods', parseInt(e.target.value) || 2)}
                              className="w-20"
                              min={2}
                              max={subject.periodsPerWeek}
                            />
                            <span className="text-xs text-muted-foreground">(placed on same day)</span>
                          </div>
                        )}
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