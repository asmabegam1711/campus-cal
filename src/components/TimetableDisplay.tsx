import { GeneratedTimetable } from '@/types/timetable';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface TimetableDisplayProps {
  timetable: GeneratedTimetable;
}

const TimetableDisplay = ({ timetable }: TimetableDisplayProps) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  const getEntryForSlot = (day: string, period: number) => {
    return timetable.entries.find(entry => 
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

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        {/* Header */}
        <div className="grid grid-cols-8 gap-1 mb-4">
          <div className="font-semibold text-sm text-muted-foreground p-2 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded">Time / Day</div>
          {days.map(day => (
            <div key={day} className="font-semibold text-sm text-center text-muted-foreground p-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded">
              {day}
            </div>
          ))}
        </div>

        {/* Timetable Grid */}
        <div className="space-y-2">
          {periods.map(period => (
            <div key={period}>
              {/* Period Row */}
              <div className="grid grid-cols-8 gap-1">
                {/* Period Header */}
                <div className="flex flex-col justify-center bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 p-3 rounded shadow-sm">
                  <div className="font-medium text-sm">📅 Period {period}</div>
                  <div className="text-xs text-muted-foreground">⏰ {getTimeForPeriod(period)}</div>
                </div>
                
                 {/* Day Cells */}
                 {days.map(day => {
                   const entry = getEntryForSlot(day, period);
                   return (
                     <Card key={`${day}-${period}`} className="min-h-[80px]">
                       <CardContent className="p-2">
                         {entry ? (
                           <div className={`rounded p-2 ${
                             entry.subjectType === 'lab' 
                               ? 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 border-purple-300' 
                               : 'bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 border-blue-300'
                           } border`}>
                             <div className="font-medium text-sm flex items-center gap-1">
                               {entry.subjectType === 'lab' ? '🧪' : '📖'} {entry.subject}
                               {entry.batch && (
                                 <Badge variant="outline" className="text-xs">
                                   Batch {entry.batch}
                                 </Badge>
                               )}
                             </div>
                             <div className="text-xs text-muted-foreground font-medium">{entry.facultyName}</div>
                             {entry.classRoom && (
                               <div className="text-xs text-muted-foreground">📍 {entry.classRoom}</div>
                             )}
                             {entry.subjectType === 'lab' && entry.isLabContinuation && (
                               <div className="text-xs text-purple-600 dark:text-purple-400">↪️ Continued</div>
                             )}
                           </div>
                         ) : (
                           <div className="text-muted-foreground text-center">-</div>
                         )}
                       </CardContent>
                     </Card>
                   );
                 })}
              </div>

              {/* Break/Lunch Row */}
              {(() => {
                const breakInfo = getBreakInfo(period);
                return breakInfo && (
                  <div className="grid grid-cols-8 gap-1 mt-1">
                    <div className="flex flex-col justify-center bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 p-2 rounded shadow-sm">
                      <div className="font-medium text-sm">☕ {breakInfo.type}</div>
                      <div className="text-xs text-muted-foreground">⏰ {breakInfo.time}</div>
                    </div>
                    {days.map(day => (
                      <div key={`${day}-break-${period}`} className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 p-2 rounded min-h-[40px] flex items-center justify-center border border-orange-200 dark:border-orange-800">
                        <span className="text-xs text-muted-foreground">🍽️ {breakInfo.type}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimetableDisplay;