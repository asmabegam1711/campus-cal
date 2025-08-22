import { GeneratedTimetable } from '@/types/timetable';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface TimetableDisplayProps {
  timetable: GeneratedTimetable;
}

const TimetableDisplay = ({ timetable }: TimetableDisplayProps) => {
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
    if (afterPeriod === 2) return 'BREAK';
    if (afterPeriod === 4) return 'LUNCH BREAK';
    if (afterPeriod === 6) return 'BREAK';
    return null;
  };

  const downloadTimetable = () => {
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
      {/* Header with Download Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {timetable.className} - Year {timetable.year} - Section {timetable.section} - Semester {timetable.semester}
          </h2>
          <p className="text-muted-foreground">Generated on {timetable.createdAt.toLocaleDateString()}</p>
        </div>
        <Button onClick={downloadTimetable} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download CSV
        </Button>
      </div>

      {/* Timetable Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border">
          {/* Header Row */}
          <thead>
            <tr>
              <th className="border border-border p-2 bg-muted text-center font-medium">
                Day/Time
              </th>
              {periods.map(period => (
                <th key={period} className="border border-border p-2 bg-muted text-center font-medium min-w-[120px]">
                  <div>Hour - {period}</div>
                  <div className="text-xs font-normal">
                    ({getTimeForPeriod(period).split('-')[0]} - {getTimeForPeriod(period).split('-')[1]})
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          {/* Body */}
          <tbody>
            {days.map(day => (
              <tr key={day}>
                <td className="border border-border p-2 bg-muted font-medium text-center">
                  {day}
                </td>
                {periods.map(period => {
                  const entries = getEntriesForSlot(day, period);
                  const displayText = getFormattedSubjectDisplay(entries);
                  
                  return (
                    <td key={`${day}-${period}`} className="border border-border p-2 text-center text-sm">
                      {displayText}
                    </td>
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