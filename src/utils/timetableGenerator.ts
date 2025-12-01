import { Faculty, TimeSlot, TimetableEntry, GeneratedTimetable, Subject } from '@/types/timetable';
import GlobalScheduleManager from './globalScheduleManager';

// Simple deterministic hash to vary timetables between classes/sections
const hashStringToNumber = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

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
  
  const baseDaysOfWeek: Array<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'> = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const classKey = `${className}-${year}-${section}-${semester}`;
  const offset = hashStringToNumber(classKey) % baseDaysOfWeek.length;
  const daysOfWeek = [
    ...baseDaysOfWeek.slice(offset),
    ...baseDaysOfWeek.slice(0, offset)
  ];
  
  
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

  // Strategic lab allocation - exactly 3 continuous periods per lab session
  // Each batch gets exactly 1 lab per day, all labs equally distributed
  const allocateLabs = () => {
    if (labSubjects.length === 0) return;
    
    const labDays = daysOfWeek;
    const numLabs = labSubjects.length;
    
    console.log(`Allocating ${numLabs} lab subjects for ${className}`);
    
    // Track which labs have been allocated for each batch
    const batchAAllocated = new Set<string>();
    const batchBAllocated = new Set<string>();
    
    // Helper to find 3 continuous available periods on a day
    const find3ContinuousPeriods = (day: string, facultyIds: string[]) => {
      for (let startPeriod = 1; startPeriod <= 6; startPeriod++) {
        const periodsNeeded = [startPeriod, startPeriod + 1, startPeriod + 2];
        
        const canAllocate = periodsNeeded.every(period => {
          if (period > 8) return false;
          
          // Check if slot is free locally
          const hasLocalConflict = entries.some(entry => 
            entry.timeSlot.day === day && entry.timeSlot.period === period
          );
          
          // Check if all faculties are available globally
          const hasGlobalConflict = facultyIds.some(fid => 
            !globalScheduleManager.isFacultyAvailable(fid, day, period)
          );
          
          return !hasLocalConflict && !hasGlobalConflict;
        });

        if (canAllocate) {
          return { startPeriod, periodsNeeded };
        }
      }
      return null;
    };
    
    // Helper to allocate a lab session for a batch
    const allocateLabSession = (
      labSubject: {faculty: Faculty, subject: Subject},
      day: string,
      periods: number[],
      batch: 'A' | 'B'
    ) => {
      periods.forEach((period, periodIndex) => {
        const timeSlot = timeSlots.find(slot => slot.day === day && slot.period === period);
        
        if (timeSlot) {
          // Try to add to global schedule first
          const assigned = globalScheduleManager.addFacultyAssignment(
            labSubject.faculty.id, day, period, className, year, section, semester
          );
          
          // Only add to local schedule if global assignment succeeded
          if (assigned) {
            entries.push({
              id: `${day}-${period}-${labSubject.faculty.id}-${batch}`,
              timeSlot,
              facultyId: labSubject.faculty.id,
              facultyName: labSubject.faculty.name,
              subject: labSubject.subject.name,
              subjectType: 'lab',
              batch: batch,
              isLabContinuation: periodIndex > 0
            });
            
            facultySchedule.get(labSubject.faculty.id)?.add(`${day}-${period}`);
          } else {
            console.warn(`Failed to assign ${labSubject.faculty.name} to ${day} Period ${period} - already assigned elsewhere`);
          }
        }
      });
    };
    
    // Rotation pattern for lab allocation
    // For N labs, we need N days where each batch does each lab exactly once
    // Day i: Batch A does Lab i, Batch B does Lab (i + offset) % N
    let dayIndex = 0;
    
    for (let i = 0; i < numLabs && dayIndex < labDays.length; i++) {
      const day = labDays[dayIndex];
      
      // Calculate which labs to assign on this day
      const batchALabIndex = i;
      const batchBLabIndex = (i + Math.floor(numLabs / 2) + (numLabs % 2)) % numLabs;
      
      const batchALab = labSubjects[batchALabIndex];
      const batchBLab = labSubjects[batchBLabIndex];
      
      // Check if both labs are already allocated
      if (batchAAllocated.has(batchALab.subject.name) && batchBAllocated.has(batchBLab.subject.name)) {
        // Try to find unallocated labs
        const unallocatedA = labSubjects.find(ls => !batchAAllocated.has(ls.subject.name));
        const unallocatedB = labSubjects.find(ls => 
          !batchBAllocated.has(ls.subject.name) && ls.subject.name !== unallocatedA?.subject.name
        );
        
        if (!unallocatedA && !unallocatedB) break;
        
        if (unallocatedA && unallocatedB) {
          const facultyIds = [unallocatedA.faculty.id, unallocatedB.faculty.id];
          const slot = find3ContinuousPeriods(day, facultyIds);
          
          if (slot) {
            allocateLabSession(unallocatedA, day, slot.periodsNeeded, 'A');
            allocateLabSession(unallocatedB, day, slot.periodsNeeded, 'B');
            batchAAllocated.add(unallocatedA.subject.name);
            batchBAllocated.add(unallocatedB.subject.name);
            console.log(`Day ${day}: Batch A → ${unallocatedA.subject.name}, Batch B → ${unallocatedB.subject.name}`);
            dayIndex++;
          } else {
            dayIndex++;
          }
        }
        continue;
      }
      
      // Determine which labs to allocate
      let labA = batchALab;
      let labB = batchBLab;
      
      // Skip if already allocated
      if (batchAAllocated.has(labA.subject.name)) {
        labA = labSubjects.find(ls => !batchAAllocated.has(ls.subject.name)) || labA;
      }
      
      if (batchBAllocated.has(labB.subject.name) || labB.subject.name === labA.subject.name) {
        labB = labSubjects.find(ls => 
          !batchBAllocated.has(ls.subject.name) && ls.subject.name !== labA.subject.name
        ) || labB;
      }
      
      // If we're trying to allocate the same lab to both batches, skip
      if (labA.subject.name === labB.subject.name) {
        dayIndex++;
        continue;
      }
      
      const facultyIds = [labA.faculty.id, labB.faculty.id];
      const slot = find3ContinuousPeriods(day, facultyIds);
      
      if (slot) {
        // Allocate labs for both batches on same periods
        if (!batchAAllocated.has(labA.subject.name)) {
          allocateLabSession(labA, day, slot.periodsNeeded, 'A');
          batchAAllocated.add(labA.subject.name);
        }
        
        if (!batchBAllocated.has(labB.subject.name)) {
          allocateLabSession(labB, day, slot.periodsNeeded, 'B');
          batchBAllocated.add(labB.subject.name);
        }
        
        console.log(`Day ${day}: Batch A → ${labA.subject.name}, Batch B → ${labB.subject.name}`);
        dayIndex++;
      } else {
        console.warn(`Could not find slot on ${day} for labs`);
        dayIndex++;
      }
    }
    
    // Report allocation status
    console.log(`Batch A allocated: ${Array.from(batchAAllocated).join(', ')}`);
    console.log(`Batch B allocated: ${Array.from(batchBAllocated).join(', ')}`);
    
    if (batchAAllocated.size < labSubjects.length) {
      console.warn(`Missing labs for Batch A: ${labSubjects.filter(ls => !batchAAllocated.has(ls.subject.name)).map(ls => ls.subject.name).join(', ')}`);
    }
    
    if (batchBAllocated.size < labSubjects.length) {
      console.warn(`Missing labs for Batch B: ${labSubjects.filter(ls => !batchBAllocated.has(ls.subject.name)).map(ls => ls.subject.name).join(', ')}`);
    }
    
    // Update weekly counts
    labSubjects.forEach(ls => {
      const countA = batchAAllocated.has(ls.subject.name) ? 1 : 0;
      const countB = batchBAllocated.has(ls.subject.name) ? 1 : 0;
      subjectWeeklyCount.set(ls.subject.name, (countA + countB) * 3);
    });
  };

  allocateLabs();

  // Smart theory allocation - allocate exactly periodsPerWeek for each subject
  const allocateTheorySubjects = () => {
    const availableSlots = timeSlots.filter(slot => {
      return !entries.some(entry => 
        entry.timeSlot.day === slot.day && 
        entry.timeSlot.period === slot.period
      );
    });

    // Track how many periods allocated for each theory subject
    const theoryPeriodsAllocated = new Map<string, number>();
    theorySubjects.forEach(ts => theoryPeriodsAllocated.set(ts.subject.name, 0));
    
    // Track period-wise subject usage
    const periodSubjectUsage: Map<number, Set<string>> = new Map();
    for (let i = 1; i <= 8; i++) {
      periodSubjectUsage.set(i, new Set());
    }

    const dailySubjectUsage: Map<string, Set<string>> = new Map();
    daysOfWeek.forEach(day => {
      dailySubjectUsage.set(day, new Set());
    });

    // Group slots by day
    const slotsByDay = new Map<string, TimeSlot[]>();
    daysOfWeek.forEach(day => {
      slotsByDay.set(day, availableSlots.filter(slot => slot.day === day));
    });

    // Helper to check if subject allocation is complete
    const isSubjectComplete = (subjectName: string, requiredPeriods: number) => {
      return (theoryPeriodsAllocated.get(subjectName) || 0) >= requiredPeriods;
    };

    // Allocate subjects day by day
    daysOfWeek.forEach(day => {
      const daySlots = slotsByDay.get(day) || [];
      const dayUsage = dailySubjectUsage.get(day) || new Set();
      
      daySlots.forEach(slot => {
        const slotKey = `${slot.day}-${slot.period}`;
        const periodUsage = periodSubjectUsage.get(slot.period) || new Set();
        
        // Find best subject that hasn't reached its required periods
        const findBestSubject = () => {
          // Filter subjects that still need allocation
          const needsAllocation = theorySubjects.filter(({subject}) => 
            !isSubjectComplete(subject.name, subject.periodsPerWeek)
          );
          
          if (needsAllocation.length === 0) return null;
          
          // For continuous allocation, prioritize continuing subjects
          const continuousSubjects = needsAllocation.filter(({faculty, subject}) => {
            if (subject.allocation !== 'continuous') return false;
            const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
            const isGloballyFree = globalScheduleManager.isFacultyAvailable(faculty.id, slot.day, slot.period);
            const isContinuous = isSubjectContinuous(slot, subject.name);
            return isFacultyFree && isGloballyFree && isContinuous;
          });
          
          if (continuousSubjects.length > 0) return continuousSubjects[0];
          
          // Priority 1: New subject for period and day
          let candidates = needsAllocation.filter(({faculty, subject}) => {
            const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
            const isGloballyFree = globalScheduleManager.isFacultyAvailable(faculty.id, slot.day, slot.period);
            const notUsedInPeriod = !periodUsage.has(subject.name);
            const notUsedToday = !dayUsage.has(subject.name);
            const continuousCheck = subject.allocation === 'random' ? !isSubjectContinuous(slot, subject.name) : true;
            
            return isFacultyFree && isGloballyFree && notUsedInPeriod && notUsedToday && continuousCheck;
          });
          
          if (candidates.length === 0) {
            // Priority 2: New subject for period
            candidates = needsAllocation.filter(({faculty, subject}) => {
              const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
              const isGloballyFree = globalScheduleManager.isFacultyAvailable(faculty.id, slot.day, slot.period);
              const notUsedInPeriod = !periodUsage.has(subject.name);
              const continuousCheck = subject.allocation === 'random' ? !isSubjectContinuous(slot, subject.name) : true;
              
              return isFacultyFree && isGloballyFree && notUsedInPeriod && continuousCheck;
            });
          }
          
          if (candidates.length === 0) {
            // Priority 3: Faculty free
            candidates = needsAllocation.filter(({faculty, subject}) => {
              const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
              const isGloballyFree = globalScheduleManager.isFacultyAvailable(faculty.id, slot.day, slot.period);
              const continuousCheck = subject.allocation === 'random' ? !isSubjectContinuous(slot, subject.name) : true;
              
              return isFacultyFree && isGloballyFree && continuousCheck;
            });
          }
          
          if (candidates.length === 0) {
            // Priority 4: Just faculty free
            candidates = needsAllocation.filter(({faculty}) => {
              const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
              const isGloballyFree = globalScheduleManager.isFacultyAvailable(faculty.id, slot.day, slot.period);
              return isFacultyFree && isGloballyFree;
            });
          }
          
          return candidates.length > 0 ? candidates[0] : null;
        };

        function isSubjectContinuous(currentSlot: TimeSlot, subjectName: string): boolean {
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
        }

        const selected = findBestSubject();
        
        if (selected) {
          // Try to add to global schedule first
          const assigned = globalScheduleManager.addFacultyAssignment(
            selected.faculty.id, slot.day, slot.period, className, year, section, semester
          );
          
          // Only allocate locally if global assignment succeeded
          if (assigned) {
            facultySchedule.get(selected.faculty.id)?.add(slotKey);
            dayUsage.add(selected.subject.name);
            periodUsage.add(selected.subject.name);
            
            // Increment allocation count
            theoryPeriodsAllocated.set(
              selected.subject.name, 
              (theoryPeriodsAllocated.get(selected.subject.name) || 0) + 1
            );
            subjectWeeklyCount.set(
              selected.subject.name, 
              (subjectWeeklyCount.get(selected.subject.name) || 0) + 1
            );
            
            // Update daily count
            const dailyMap = subjectDailyCount.get(selected.subject.name);
            if (dailyMap) {
              dailyMap.set(slot.day, (dailyMap.get(slot.day) || 0) + 1);
            }
            
            entries.push({
              id: `${slot.day}-${slot.period}-${selected.faculty.id}`,
              timeSlot: slot,
              facultyId: selected.faculty.id,
              facultyName: selected.faculty.name,
              subject: selected.subject.name,
              subjectType: 'theory'
            });
            
            console.log(`Allocated ${selected.subject.name}: ${theoryPeriodsAllocated.get(selected.subject.name)}/${selected.subject.periodsPerWeek} periods`);
          } else {
            console.warn(`Skipped ${selected.subject.name} (${selected.faculty.name}) - faculty already assigned at ${slot.day} Period ${slot.period}`);
          }
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
    entries: entries.sort((a, b) => {
      // Sort by day then by period for better display
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayComparison = dayOrder.indexOf(a.timeSlot.day) - dayOrder.indexOf(b.timeSlot.day);
      if (dayComparison !== 0) return dayComparison;
      return a.timeSlot.period - b.timeSlot.period;
    }),
    createdAt: new Date(),
    createdBy
  };
};