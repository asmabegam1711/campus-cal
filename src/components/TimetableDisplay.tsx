import React from 'react';
import { GeneratedTimetable } from '@/types/timetable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileSpreadsheet, FileText, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface TimetableDisplayProps {
  timetable: GeneratedTimetable;
  onDelete?: () => void;
}

const TimetableDisplay = ({ timetable, onDelete }: TimetableDisplayProps) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  const getEntriesForSlot = (day: string, period: number) => {
    return timetable.entries.filter(entry => 
      entry.timeSlot.day === day && entry.timeSlot.period === period
    );
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

  const getSubjectColor = (subject: string, isLab: boolean = false, isClub: boolean = false) => {
    // Special color for club activities
    if (isClub || subject === 'Club Activity') {
      return 'bg-amber-100 text-amber-900 border-amber-300';
    }
    
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
              <Button 
                onClick={downloadCSV} 
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
              <Button 
                onClick={downloadPDF} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              {onDelete && (
                <Button 
                  onClick={onDelete} 
                  variant="destructive"
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
                  const isClub = entries.length > 0 && (entries[0].isClubSession || entries[0].subject === 'Club Activity');
                  const colorClass = displayText !== 'Free' ? getSubjectColor(displayText, isLab, isClub) : 'bg-gray-100 text-gray-500';
                  
                  return (
                    <React.Fragment key={`${day}-${period}`}>
                      <td className={`border border-gray-300 p-2 text-center text-sm font-medium ${colorClass} relative`}>
                        <div className="rounded-md p-2 h-full flex items-center justify-center">
                          {displayText === 'Free' ? (
                            <span className="text-gray-400 italic">Free</span>
                          ) : (
                            <span className="font-semibold">{displayText}</span>
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
    </div>
  );
};

export default TimetableDisplay;