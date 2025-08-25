import { Faculty, TimeSlot, TimetableEntry, GeneratedTimetable, Subject } from '@/types/timetable';
import GlobalScheduleManager from './globalScheduleManager';

// Generate time slots based on college schedule
export const generateTimeSlots = (): TimeSlot[] => {
  const days: Array<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'> = 
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  const slots: TimeSlot[] = [];
  
  days.forEach(day => {
    // Period 1: 9:00-9:50
    slots.push({
      day,
      period: 1,
      startTime: '9:00 AM',
      endTime: '9:50 AM',
      type: 'class'
    });
    
    // Period 2: 9:50-10:40
    slots.push({
      day,
      period: 2,
      startTime: '9:50 AM',
      endTime: '10:40 AM',
      type: 'class'
    });
    
    // Break: 10:40-10:55
    slots.push({
      day,
      period: 0,
      startTime: '10:40 AM',
      endTime: '10:55 AM',
      type: 'break'
    });
    
    // Period 3: 10:55-11:45
    slots.push({
      day,
      period: 3,
      startTime: '10:55 AM',
      endTime: '11:45 AM',
      type: 'class'
    });
    
    // Period 4: 11:45-12:35
    slots.push({
      day,
      period: 4,
      startTime: '11:45 AM',
      endTime: '12:35 PM',
      type: 'class'
    });
    
    // Lunch: 12:35-1:15
    slots.push({
      day,
      period: 0,
      startTime: '12:35 PM',
      endTime: '1:15 PM',
      type: 'lunch'
    });
    
    // Period 5: 1:15-2:05
    slots.push({
      day,
      period: 5,
      startTime: '1:15 PM',
      endTime: '2:05 PM',
      type: 'class'
    });
    
    // Period 6: 2:05-2:55
    slots.push({
      day,
      period: 6,
      startTime: '2:05 PM',
      endTime: '2:55 PM',
      type: 'class'
    });
    
    // Break: 2:55-3:10
    slots.push({
      day,
      period: 0,
      startTime: '2:55 PM',
      endTime: '3:10 PM',
      type: 'break'
    });
    
    // Period 7: 3:10-4:00
    slots.push({
      day,
      period: 7,
      startTime: '3:10 PM',
      endTime: '4:00 PM',
      type: 'class'
    });
    
    // Period 8: 4:00-4:50
    slots.push({
      day,
      period: 8,
      startTime: '4:00 PM',
      endTime: '4:50 PM',
      type: 'class'
    });
  });
  
  return slots;
};

export const generateTimetable = (
  faculties: Faculty[],
  className: string,
  year: number,
  section: string,
  semester: number,
  createdBy: string
): GeneratedTimetable => {
  const timeSlots = generateTimeSlots().filter(slot => slot.type === 'class');
  const entries: TimetableEntry[] = [];
  const facultySchedule: Map<string, Set<string>> = new Map();
  const subjectWeeklyCount: Map<string, number> = new Map();
  const subjectDailyCount: Map<string, Map<string, number>> = new Map();
  const globalScheduleManager = GlobalScheduleManager.getInstance();
  
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Initialize tracking
  faculties.forEach(faculty => {
    facultySchedule.set(faculty.id, new Set());
    faculty.subjects.forEach(subject => {
      subjectWeeklyCount.set(subject.name, 0);
      const dailyMap = new Map();
      daysOfWeek.forEach(day => dailyMap.set(day, 0));
      subjectDailyCount.set(subject.name, dailyMap);
    });
  });

  // Group subjects by type
  const allSubjects: Array<{faculty: Faculty, subject: Subject}> = [];
  faculties.forEach(faculty => {
    faculty.subjects.forEach(subject => {
      allSubjects.push({faculty, subject});
    });
  });

  const theorySubjects = allSubjects.filter(s => s.subject.type === 'theory');
  const labSubjects = allSubjects.filter(s => s.subject.type === 'lab');

  // Strategic lab allocation - distribute across different days with proper batch splitting
  const allocateLabs = () => {
    const labDays = ['Monday', 'Wednesday', 'Friday']; // Distribute labs on alternate days
    let labDayIndex = 0;
    
    // Process each lab subject individually for proper allocation
    labSubjects.forEach((labSubject, index) => {
      const targetDay = labDays[labDayIndex % labDays.length];
      labDayIndex++;
      
      // Find available 3-period slots for lab
      const findLabSlot = () => {
        for (let startPeriod = 1; startPeriod <= 6; startPeriod++) {
          const periodsNeeded = [startPeriod, startPeriod + 1, startPeriod + 2];
          
          const canAllocate = periodsNeeded.every(period => {
            if (period > 8) return false;
            // Check local schedule
            const hasLocalConflict = entries.some(entry => 
              entry.timeSlot.day === targetDay && entry.timeSlot.period === period
            );
            // Check global schedule for faculty availability
            const hasGlobalConflict = !globalScheduleManager.isFacultyAvailable(labSubject.faculty.id, targetDay, period) ||
              (batchBLab && !globalScheduleManager.isFacultyAvailable(batchBLab.faculty.id, targetDay, period));
            
            return !hasLocalConflict && !hasGlobalConflict;
          });

          if (canAllocate) {
            return { startPeriod, periodsNeeded };
          }
        }
        return null;
      };

      const labSlot = findLabSlot();
      if (!labSlot) return;
      
      // Find another lab subject for batch B (different from current lab)
      const otherLabSubjects = labSubjects.filter(lab => lab.subject.name !== labSubject.subject.name);
      const batchBLab = otherLabSubjects.length > 0 
        ? otherLabSubjects[index % otherLabSubjects.length] 
        : labSubjects[(index + 1) % labSubjects.length];
      
      labSlot.periodsNeeded.forEach((period, periodIndex) => {
        const timeSlot = timeSlots.find(slot => slot.day === targetDay && slot.period === period);
        
        if (timeSlot) {
          // Batch A - Current lab subject
          entries.push({
            id: `${targetDay}-${period}-${labSubject.faculty.id}-A`,
            timeSlot,
            facultyId: labSubject.faculty.id,
            facultyName: labSubject.faculty.name,
            subject: labSubject.subject.name,
            subjectType: 'lab',
            batch: 'A',
            isLabContinuation: periodIndex > 0
          });
          
          // Batch B - Different lab subject
          entries.push({
            id: `${targetDay}-${period}-${batchBLab.faculty.id}-B`,
            timeSlot,
            facultyId: batchBLab.faculty.id,
            facultyName: batchBLab.faculty.name,
            subject: batchBLab.subject.name,
            subjectType: 'lab',
            batch: 'B',
            isLabContinuation: periodIndex > 0
          });
          
          // Mark faculty as busy locally and globally
          facultySchedule.get(labSubject.faculty.id)?.add(`${targetDay}-${period}`);
          facultySchedule.get(batchBLab.faculty.id)?.add(`${targetDay}-${period}`);
          globalScheduleManager.addFacultyAssignment(labSubject.faculty.id, targetDay, period, className, year, section, semester);
          globalScheduleManager.addFacultyAssignment(batchBLab.faculty.id, targetDay, period, className, year, section, semester);
        }
      });
      
      // Update subject counts
      subjectWeeklyCount.set(labSubject.subject.name, (subjectWeeklyCount.get(labSubject.subject.name) || 0) + 1);
      subjectWeeklyCount.set(batchBLab.subject.name, (subjectWeeklyCount.get(batchBLab.subject.name) || 0) + 1);
    });
  };

  allocateLabs();

  // Smart theory allocation with better distribution
  const allocateTheorySubjects = () => {
    const availableSlots = timeSlots.filter(slot => {
      return !entries.some(entry => 
        entry.timeSlot.day === slot.day && 
        entry.timeSlot.period === slot.period
      );
    });

    // Track period-wise subject usage to avoid same subject in same period across days
    const periodSubjectUsage: Map<number, Set<string>> = new Map();
    for (let i = 1; i <= 8; i++) {
      periodSubjectUsage.set(i, new Set());
    }

    // Create distributed subject pool
    const createSubjectPool = () => {
      const pool: Array<{faculty: Faculty, subject: Subject, priority: number}> = [];
      
      theorySubjects.forEach(({faculty, subject}) => {
        for (let i = 0; i < subject.periodsPerWeek; i++) {
          pool.push({
            faculty, 
            subject, 
            priority: Math.random() // Randomize for better distribution
          });
        }
      });
      
      return pool.sort((a, b) => b.priority - a.priority);
    };

    let subjectPool = createSubjectPool();
    const dailySubjectUsage: Map<string, Set<string>> = new Map();
    
    // Initialize daily tracking
    daysOfWeek.forEach(day => {
      dailySubjectUsage.set(day, new Set());
    });

    // Group slots by day for better distribution
    const slotsByDay = new Map<string, TimeSlot[]>();
    daysOfWeek.forEach(day => {
      slotsByDay.set(day, availableSlots.filter(slot => slot.day === day));
    });

    // Allocate subjects day by day with period distribution
    daysOfWeek.forEach(day => {
      const daySlots = slotsByDay.get(day) || [];
      const dayUsage = dailySubjectUsage.get(day) || new Set();
      
      daySlots.forEach(slot => {
        const slotKey = `${slot.day}-${slot.period}`;
        const periodUsage = periodSubjectUsage.get(slot.period) || new Set();
        
        if (subjectPool.length === 0) {
          subjectPool = createSubjectPool();
        }
        
        // Find best subject with enhanced distribution logic
        const findBestSubject = () => {
          // Priority 1: New subject for period and day
          let candidates = subjectPool.filter(({faculty, subject}) => {
            const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
            const isGloballyFree = globalScheduleManager.isFacultyAvailable(faculty.id, slot.day, slot.period);
            const notUsedInPeriod = !periodUsage.has(subject.name);
            const notUsedToday = !dayUsage.has(subject.name);
            const notContinuous = !isSubjectContinuous(slot, subject.name);
            
            return isFacultyFree && isGloballyFree && notUsedInPeriod && notUsedToday && notContinuous;
          });
          
          if (candidates.length === 0) {
            // Priority 2: New subject for period, avoid continuous
            candidates = subjectPool.filter(({faculty, subject}) => {
              const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
              const isGloballyFree = globalScheduleManager.isFacultyAvailable(faculty.id, slot.day, slot.period);
              const notUsedInPeriod = !periodUsage.has(subject.name);
              const notContinuous = !isSubjectContinuous(slot, subject.name);
              
              return isFacultyFree && isGloballyFree && notUsedInPeriod && notContinuous;
            });
          }
          
          if (candidates.length === 0) {
            // Priority 3: Faculty free, avoid continuous
            candidates = subjectPool.filter(({faculty, subject}) => {
              const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
              const isGloballyFree = globalScheduleManager.isFacultyAvailable(faculty.id, slot.day, slot.period);
              const notContinuous = !isSubjectContinuous(slot, subject.name);
              
              return isFacultyFree && isGloballyFree && notContinuous;
            });
          }
          
          if (candidates.length === 0) {
            // Priority 4: Just faculty free
            candidates = subjectPool.filter(({faculty}) => {
              const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
              const isGloballyFree = globalScheduleManager.isFacultyAvailable(faculty.id, slot.day, slot.period);
              return isFacultyFree && isGloballyFree;
            });
          }
          
          return candidates.length > 0 ? candidates[0] : null;
        };

        const isSubjectContinuous = (currentSlot: TimeSlot, subjectName: string) => {
          // Check previous period
          if (currentSlot.period > 1) {
            const prevEntry = entries.find(entry => 
              entry.timeSlot.day === currentSlot.day && 
              entry.timeSlot.period === currentSlot.period - 1 &&
              entry.subject === subjectName
            );
            if (prevEntry) return true;
          }
          
          // Check next period
          if (currentSlot.period < 8) {
            const nextEntry = entries.find(entry => 
              entry.timeSlot.day === currentSlot.day && 
              entry.timeSlot.period === currentSlot.period + 1 &&
              entry.subject === subjectName
            );
            if (nextEntry) return true;
          }
          
          return false;
        };

        const selected = findBestSubject();
        
        if (selected) {
          // Allocate the subject locally and globally
          facultySchedule.get(selected.faculty.id)?.add(slotKey);
          globalScheduleManager.addFacultyAssignment(selected.faculty.id, slot.day, slot.period, className, year, section, semester);
          dayUsage.add(selected.subject.name);
          periodUsage.add(selected.subject.name);
          subjectWeeklyCount.set(selected.subject.name, (subjectWeeklyCount.get(selected.subject.name) || 0) + 1);
          
          // Update daily count
          const dailyMap = subjectDailyCount.get(selected.subject.name);
          if (dailyMap) {
            dailyMap.set(slot.day, (dailyMap.get(slot.day) || 0) + 1);
          }
          
          // Remove from pool
          const index = subjectPool.findIndex(s => 
            s.faculty.id === selected.faculty.id && s.subject.name === selected.subject.name
          );
          if (index !== -1) {
            subjectPool.splice(index, 1);
          }
          
          entries.push({
            id: `${slot.day}-${slot.period}-${selected.faculty.id}`,
            timeSlot: slot,
            facultyId: selected.faculty.id,
            facultyName: selected.faculty.name,
            subject: selected.subject.name,
            subjectType: 'theory'
          });
        }
      });
    });
  };

  allocateTheorySubjects();

  return {
    id: Date.now().toString(),
    className,
    year,
    section,
    semester,
    entries,
    createdAt: new Date(),
    createdBy
  };
};