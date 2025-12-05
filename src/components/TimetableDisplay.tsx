import React, { useState, useEffect, useMemo } from 'react';
import { GeneratedTimetable, TimetableEntry, Faculty } from '@/types/timetable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileSpreadsheet, FileText, Trash2, Edit3, Save, X, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface FacultyDetail {
  facultyId: string;
  facultyName: string;
  subjects: { name: string; periods: number; type: 'theory' | 'lab' }[];
  totalPeriods: number;
}

interface TimetableDisplayProps {
  timetable: GeneratedTimetable;
  onDelete?: () => void;
  onUpdate?: (updatedTimetable: GeneratedTimetable) => void;
  availableFaculties?: Faculty[];
}

const TimetableDisplay = ({ timetable, onDelete, onUpdate, availableFaculties = [] }: TimetableDisplayProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [facultyDialogOpen, setFacultyDialogOpen] = useState(false);
  const [editedTimetable, setEditedTimetable] = useState<GeneratedTimetable>(timetable);
  const { toast } = useToast();

  // Calculate faculty details from timetable entries
  const facultyDetails = useMemo((): FacultyDetail[] => {
    const facultyMap = new Map<string, FacultyDetail>();

    editedTimetable.entries.forEach(entry => {
      if (!entry.facultyId || entry.isLabContinuation) return;

      if (!facultyMap.has(entry.facultyId)) {
        facultyMap.set(entry.facultyId, {
          facultyId: entry.facultyId,
          facultyName: entry.facultyName,
          subjects: [],
          totalPeriods: 0
        });
      }

      const faculty = facultyMap.get(entry.facultyId)!;
      const existingSubject = faculty.subjects.find(s => s.name === entry.subject && s.type === entry.subjectType);
      
      if (existingSubject) {
        existingSubject.periods++;
      } else {
        faculty.subjects.push({
          name: entry.subject,
          periods: 1,
          type: entry.subjectType
        });
      }
      faculty.totalPeriods++;
    });

    return Array.from(facultyMap.values()).sort((a, b) => a.facultyName.localeCompare(b.facultyName));
  }, [editedTimetable.entries]);

  // Update editedTimetable when timetable prop changes
  useEffect(() => {
    setEditedTimetable(timetable);
    setIsEditMode(false);
  }, [timetable.id]);
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  const getEntriesForSlot = (day: string, period: number) => {
    return editedTimetable.entries.filter(entry => 
      entry.timeSlot.day === day && entry.timeSlot.period === period
    );
  };

  const handleSlotClick = (day: string, period: number) => {
    if (!isEditMode) return;
    
    const entries = getEntriesForSlot(day, period);
    if (entries.length > 0) {
      setEditingEntry(entries[0]); // Edit first entry if multiple
      setEditDialogOpen(true);
    }
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;

    const updatedEntries = editedTimetable.entries.map(entry => 
      entry.id === editingEntry.id ? editingEntry : entry
    );

    const updatedTimetable = {
      ...editedTimetable,
      entries: updatedEntries
    };

    setEditedTimetable(updatedTimetable);
    setEditDialogOpen(false);
    setEditingEntry(null);
    
    toast({
      title: "Success",
      description: "Time slot updated successfully",
    });
  };

  const handleDeleteEntry = () => {
    if (!editingEntry) return;

    const updatedEntries = editedTimetable.entries.filter(entry => 
      entry.id !== editingEntry.id
    );

    const updatedTimetable = {
      ...editedTimetable,
      entries: updatedEntries
    };

    setEditedTimetable(updatedTimetable);
    setEditDialogOpen(false);
    setEditingEntry(null);
    
    toast({
      title: "Success",
      description: "Time slot cleared successfully",
    });
  };

  const handleSaveChanges = () => {
    if (onUpdate) {
      onUpdate(editedTimetable);
      setIsEditMode(false);
      toast({
        title: "Success",
        description: "Timetable changes saved",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditedTimetable(timetable);
    setIsEditMode(false);
    toast({
      title: "Cancelled",
      description: "Changes discarded",
    });
  };

  const getFormattedSubjectDisplay = (entries: any[]) => {
    if (entries.length === 0) return 'Free';
    
    if (entries.length === 2 && entries[0].subjectType === 'lab') {
      // Lab with batch splitting - format like "DA (A) / INS (B) LAB"
      const batchA = entries.find(e => e.batch === 'A');
      const batchB = entries.find(e => e.batch === 'B');
      
      if (batchA && batchB) {
        if (batchA.subject === batchB.subject) {
          return `${batchA.subject} LAB`;
        } else {
          return `${batchA.subject} (A) / ${batchB.subject} (B) LAB`;
        }
      }
    }
    
    if (entries.length === 1) {
      const entry = entries[0];
      return entry.subjectType === 'lab' ? `${entry.subject} LAB` : entry.subject;
    }
    
    return entries.map(e => e.subject).join(' / ');
  };

  const getTimeForPeriod = (period: number) => {
    const timeMap: Record<number, string> = {
      1: '9:00-9:50',
      2: '9:50-10:40',
      3: '10:55-11:45',
      4: '11:45-12:35',
      5: '1:15-2:05',
      6: '2:05-2:55',
      7: '3:10-4:00',
      8: '4:00-4:50'
    };
    return timeMap[period] || '';
  };

  const getBreakInfo = (afterPeriod: number) => {
    if (afterPeriod === 2) return { type: 'break', time: '10:40-10:55', duration: '15 mins' };
    if (afterPeriod === 4) return { type: 'lunch', time: '12:35-1:15', duration: '40 mins' };
    if (afterPeriod === 6) return { type: 'break', time: '2:55-3:10', duration: '15 mins' };
    return null;
  };

  const getSubjectColor = (subject: string, isLab: boolean = false) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200', 
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-teal-100 text-teal-800 border-teal-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-red-100 text-red-800 border-red-200'
    ];
    
    const labColors = [
      'bg-blue-200 text-blue-900 border-blue-300',
      'bg-green-200 text-green-900 border-green-300',
      'bg-purple-200 text-purple-900 border-purple-300',
      'bg-orange-200 text-orange-900 border-orange-300'
    ];
    
    const colorSet = isLab ? labColors : colors;
    const hash = subject.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colorSet[hash % colorSet.length];
  };

  const downloadCSV = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timetable_${timetable.className}_Year${timetable.year}_${timetable.section}_Sem${timetable.semester}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPDF = async () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); 
      
      // Add title
      doc.setFontSize(16);
      doc.text(`Timetable - ${timetable.className} Year ${timetable.year} Section ${timetable.section} Semester ${timetable.semester}`, 20, 20);
      
      // Prepare table data
      const tableData: string[][] = [];
      const headers = ['Time/Day', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      periods.forEach(period => {
        const row = [getTimeForPeriod(period)];
        days.forEach(day => {
          const entries = getEntriesForSlot(day, period);
          const displayText = entries.length > 0 ? getFormattedSubjectDisplay(entries) : 'Free';
          row.push(displayText);
        });
        tableData.push(row);
        
        // Add break info after certain periods
        const breakInfo = getBreakInfo(period);
        if (breakInfo) {
          const breakRow = [breakInfo.type.toUpperCase() + ' (' + breakInfo.duration + ')', '', '', '', '', '', ''];
          tableData.push(breakRow);
        }
      });
      
      // Use autoTable directly
      const autoTable = (await import('jspdf-autotable')).default;
      
      // Generate table using autoTable
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 30,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 25, fontStyle: 'bold' },
        },
      });
      
      doc.save(`timetable_${timetable.className}_Year${timetable.year}_${timetable.section}_Sem${timetable.semester}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const generateCSV = () => {
    let csv = 'Day,Period,Time,Subject,Faculty,Type,Batch\n';
    
    days.forEach(day => {
      periods.forEach(period => {
        const entries = getEntriesForSlot(day, period);
        if (entries.length > 0) {
          const displayText = getFormattedSubjectDisplay(entries);
          csv += `${day},${period},${getTimeForPeriod(period)},${displayText},,,,\n`;
        } else {
          csv += `${day},${period},${getTimeForPeriod(period)},Free,,,,\n`;
        }
      });
    });
    
    return csv;
  };

  return (
    <div className="space-y-4">
      {/* Header with Download Buttons */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">
                {timetable.className} - Year {timetable.year} - Section {timetable.section} - Semester {timetable.semester}
              </CardTitle>
              <CardDescription>
                Generated on {new Date(timetable.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {onUpdate && (
                <>
                  {!isEditMode ? (
                    <Button 
                      onClick={() => setIsEditMode(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit Timetable
                    </Button>
                  ) : (
                    <>
                      <Button 
                        onClick={handleSaveChanges}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                      <Button 
                        onClick={handleCancelEdit}
                        variant="outline"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </>
                  )}
                </>
              )}
              <Button 
                onClick={downloadCSV} 
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isEditMode}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
              <Button 
                onClick={downloadPDF} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isEditMode}
              >
                <FileText className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button 
                onClick={() => setFacultyDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isEditMode}
              >
                <Users className="mr-2 h-4 w-4" />
                View Faculty Details
              </Button>
              {onDelete && (
                <Button 
                  onClick={onDelete} 
                  variant="destructive"
                  disabled={isEditMode}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Timetable Table */}
      <div className="overflow-x-auto shadow-lg rounded-lg">
        <table className="w-full border-collapse border-0">
          {/* Header Row */}
          <thead>
            <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <th className="border border-gray-300 p-3 text-center font-bold">
                Day/Time
              </th>
              {periods.map((period, index) => (
                <React.Fragment key={period}>
                  <th className="border border-gray-300 p-3 text-center font-bold min-w-[140px]">
                    <div className="text-sm">Hour {period}</div>
                    <div className="text-xs font-normal opacity-90">
                      {getTimeForPeriod(period)}
                    </div>
                  </th>
                  {/* Break columns */}
                  {[2, 4, 6].includes(period) && (
                    <th className="border border-gray-300 p-2 bg-yellow-500 text-yellow-900 text-center font-bold min-w-[100px]">
                      <div className="text-xs">
                        {getBreakInfo(period)?.type.toUpperCase()}
                      </div>
                      <div className="text-xs font-normal">
                        {getBreakInfo(period)?.time}
                      </div>
                    </th>
                  )}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          
          {/* Body */}
          <tbody>
            {days.map((day, dayIndex) => (
              <tr key={day} className={dayIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="border border-gray-300 p-3 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold text-center">
                  {day}
                </td>
                {periods.map((period, periodIndex) => {
                  const entries = getEntriesForSlot(day, period);
                  const displayText = getFormattedSubjectDisplay(entries);
                  const isLab = entries.length > 0 && entries[0].subjectType === 'lab';
                  const colorClass = displayText !== 'Free' ? getSubjectColor(displayText, isLab) : 'bg-gray-100 text-gray-500';
                  
                  return (
                    <React.Fragment key={`${day}-${period}`}>
                      <td 
                        className={`border border-gray-300 p-2 text-center text-sm font-medium ${colorClass} relative ${
                          isEditMode && displayText !== 'Free' ? 'cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-purple-500' : ''
                        }`}
                        onClick={() => handleSlotClick(day, period)}
                      >
                        <div className="rounded-md p-2 h-full flex items-center justify-center">
                          {displayText === 'Free' ? (
                            <span className="text-gray-400 italic">Free</span>
                          ) : (
                            <>
                              <span className="font-semibold">{displayText}</span>
                              {isEditMode && (
                                <Edit3 className="ml-2 h-3 w-3 opacity-50" />
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      {/* Break cells */}
                      {[2, 4, 6].includes(period) && (
                        <td className="border border-gray-300 p-2 text-center">
                          <div className={`rounded-md p-2 h-full flex flex-col items-center justify-center text-xs font-medium ${
                            period === 4 ? 'bg-orange-200 text-orange-800' : 'bg-yellow-200 text-yellow-800'
                          }`}>
                            <div className="font-bold">
                              {getBreakInfo(period)?.type.toUpperCase()}
                            </div>
                            <div className="text-xs">
                              {getBreakInfo(period)?.duration}
                            </div>
                          </div>
                        </td>
                      )}
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Time Slot</DialogTitle>
            <DialogDescription>
              Modify the details for {editingEntry?.timeSlot.day} - Period {editingEntry?.timeSlot.period}
            </DialogDescription>
          </DialogHeader>
          
          {editingEntry && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Name</Label>
                <Input
                  id="subject"
                  value={editingEntry.subject}
                  onChange={(e) => setEditingEntry({ ...editingEntry, subject: e.target.value })}
                  placeholder="Enter subject name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faculty">Faculty Name</Label>
                {availableFaculties.length > 0 ? (
                  <Select
                    value={editingEntry.facultyId}
                    onValueChange={(value) => {
                      const selectedFaculty = availableFaculties.find(f => f.id === value);
                      if (selectedFaculty) {
                        setEditingEntry({
                          ...editingEntry,
                          facultyId: value,
                          facultyName: selectedFaculty.name
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFaculties.map((faculty) => (
                        <SelectItem key={faculty.id} value={faculty.id}>
                          {faculty.name} ({faculty.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="faculty"
                    value={editingEntry.facultyName}
                    onChange={(e) => setEditingEntry({ ...editingEntry, facultyName: e.target.value })}
                    placeholder="Enter faculty name"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Subject Type</Label>
                <Select
                  value={editingEntry.subjectType}
                  onValueChange={(value: 'theory' | 'lab') => 
                    setEditingEntry({ ...editingEntry, subjectType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theory">Theory</SelectItem>
                    <SelectItem value="lab">Lab</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingEntry.subjectType === 'lab' && (
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch</Label>
                  <Select
                    value={editingEntry.batch || 'A'}
                    onValueChange={(value: 'A' | 'B') => 
                      setEditingEntry({ ...editingEntry, batch: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Batch A</SelectItem>
                      <SelectItem value="B">Batch B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleDeleteEntry}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Slot
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Faculty Details Dialog */}
      <Dialog open={facultyDialogOpen} onOpenChange={setFacultyDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Faculty Details</DialogTitle>
            <DialogDescription>
              Faculty allocation for {timetable.className} - Year {timetable.year} - Section {timetable.section}
            </DialogDescription>
          </DialogHeader>
          
          {facultyDetails.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty ID</TableHead>
                  <TableHead>Faculty Name</TableHead>
                  <TableHead>Subject(s)</TableHead>
                  <TableHead className="text-center">Periods</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facultyDetails.map((faculty) => (
                  <TableRow key={faculty.facultyId}>
                    <TableCell className="font-mono text-sm">{faculty.facultyId}</TableCell>
                    <TableCell className="font-medium">{faculty.facultyName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {faculty.subjects.map((subject, idx) => (
                          <span key={idx} className="text-sm">
                            {subject.name} 
                            <span className="text-muted-foreground ml-1">
                              ({subject.type === 'lab' ? 'Lab' : 'Theory'} - {subject.periods} periods)
                            </span>
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">{faculty.totalPeriods}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No faculty allocations found in this timetable.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFacultyDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimetableDisplay;