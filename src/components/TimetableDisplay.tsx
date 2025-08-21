import { GeneratedTimetable } from '@/types/timetable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
          <div className="font-semibold text-sm text-muted-foreground">Time / Day</div>
          {days.map(day => (
            <div key={day} className="font-semibold text-sm text-center text-muted-foreground">
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
                <div className="flex flex-col justify-center bg-muted p-2 rounded">
                  <div className="font-medium text-sm">Period {period}</div>
                  <div className="text-xs text-muted-foreground">{getTimeForPeriod(period)}</div>
                </div>
                
                {/* Day Cells */}
                {days.map(day => {
                  const entry = getEntryForSlot(day, period);
                  return (
                    <Card key={`${day}-${period}`} className="min-h-[80px]">
                      <CardContent className="p-2">
                        {entry ? (
                          <div className="space-y-1">
                            <div className="font-medium text-sm truncate">{entry.subject}</div>
                            <div className="text-xs text-muted-foreground truncate">{entry.facultyName}</div>
                            {entry.classRoom && (
                              <Badge variant="secondary" className="text-xs">
                                {entry.classRoom}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">Free</div>
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
                    <div className="flex flex-col justify-center bg-accent/20 p-2 rounded">
                      <div className="font-medium text-sm">{breakInfo.type}</div>
                      <div className="text-xs text-muted-foreground">{breakInfo.time}</div>
                    </div>
                    {days.map(day => (
                      <div key={`${day}-break-${period}`} className="bg-accent/10 p-2 rounded min-h-[40px] flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">{breakInfo.type}</span>
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