import { GeneratedTimetable } from '@/types/timetable';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
    if (afterPeriod === 2) return { type: 'Break', time: '10:40-10:55' };
    if (afterPeriod === 4) return { type: 'Lunch', time: '12:35-1:15' };
    if (afterPeriod === 6) return { type: 'Break', time: '2:55-3:10' };
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
    let csv = 'Day,Period,Time,Subject,Faculty,Type,Batch,Classroom\n';
    
    days.forEach(day => {
      periods.forEach(period => {
        const entries = getEntriesForSlot(day, period);
        if (entries.length > 0) {
          entries.forEach(entry => {
            csv += `${day},${period},${getTimeForPeriod(period)},${entry.subject},${entry.facultyName},${entry.subjectType},${entry.batch || ''},${entry.classRoom || ''}\n`;
          });
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

      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header - Periods horizontal */}
          <div className="grid grid-cols-9 gap-1 mb-4">
            <div className="font-semibold text-sm text-muted-foreground p-2 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded">Day / Period</div>
            {periods.map(period => (
              <div key={period} className="font-semibold text-sm text-center text-muted-foreground p-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded">
                <div>Period {period}</div>
                <div className="text-xs">{getTimeForPeriod(period)}</div>
              </div>
            ))}
          </div>

          {/* Timetable Grid - Days vertical */}
          <div className="space-y-2">
            {days.map(day => (
              <div key={day}>
                {/* Day Row */}
                <div className="grid grid-cols-9 gap-1">
                  {/* Day Header */}
                  <div className="flex items-center justify-center bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 p-3 rounded shadow-sm">
                    <div className="font-medium text-sm">📅 {day}</div>
                  </div>
                  
                  {/* Period Cells */}
                  {periods.map(period => {
                    const entries = getEntriesForSlot(day, period);
                    return (
                      <Card key={`${day}-${period}`} className="min-h-[80px]">
                        <CardContent className="p-2">
                          {entries.length > 0 ? (
                            <div className="space-y-1">
                              {entries.map((entry, index) => (
                                <div key={entry.id} className={`rounded p-1 ${
                                  entry.subjectType === 'lab' 
                                    ? 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 border-purple-300' 
                                    : 'bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 border-blue-300'
                                } border`}>
                                  <div className="font-medium text-xs flex items-center gap-1">
                                    {entry.subjectType === 'lab' ? '🧪' : '📖'} {entry.subject}
                                    {entry.batch && (
                                      <Badge variant="outline" className="text-xs h-4">
                                        {entry.batch}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{entry.facultyName}</div>
                                  {entry.classRoom && (
                                    <div className="text-xs text-muted-foreground">📍 {entry.classRoom}</div>
                                  )}
                                  {entry.subjectType === 'lab' && entry.isLabContinuation && (
                                    <div className="text-xs text-purple-600 dark:text-purple-400">↪️ Cont.</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-muted-foreground text-center text-sm">Free</div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Break/Lunch Row after specific periods */}
                {[2, 4, 6].map(breakAfterPeriod => {
                  const breakInfo = getBreakInfo(breakAfterPeriod);
                  return breakInfo && (
                    <div key={`${day}-break-${breakAfterPeriod}`} className="grid grid-cols-9 gap-1 mt-1 mb-2">
                      <div className="flex items-center justify-center bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 p-2 rounded shadow-sm">
                        <div className="font-medium text-sm">☕ {breakInfo.type}</div>
                      </div>
                      {periods.map(period => (
                        <div key={`${day}-break-${period}`} className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 p-2 rounded min-h-[30px] flex items-center justify-center border border-orange-200 dark:border-orange-800">
                          <span className="text-xs text-muted-foreground">{breakInfo.type}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableDisplay;