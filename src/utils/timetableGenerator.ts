import { Faculty, TimeSlot, TimetableEntry, GeneratedTimetable, Subject } from '@/types/timetable';

// Enhanced deterministic hash for better variation between classes/sections
const hashStringToNumber = (value: string): number => {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
    hash = hash >>> 0; // Keep as unsigned 32-bit
  }
  return hash;
};

// Seeded random number generator for deterministic but varied results
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

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
  
  // Create seeded random generator for this specific class/section
  const classKey = `${className}-${year}-${section}-${semester}`;
  const seed = hashStringToNumber(classKey);
  const rng = new SeededRandom(seed);
  
  const baseDaysOfWeek: Array<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'> = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Shuffle days based on classKey for unique ordering per section
  const daysOfWeek = rng.shuffle(baseDaysOfWeek);
  
  
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

  // Shuffle subjects using seeded random for unique arrangement per section
  const shuffledTheorySubjects = rng.shuffle(theorySubjects);
  const shuffledLabSubjects = rng.shuffle(labSubjects);

  // Strategic lab allocation - exactly 3 continuous periods per lab session
  // Each batch gets exactly 1 lab per day, all labs equally distributed
  const allocateLabs = () => {
    if (shuffledLabSubjects.length === 0) return;
    
    const labDays = daysOfWeek;
    const numLabs = shuffledLabSubjects.length;
    
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
          
          // Check if slot is free locally within this class timetable only
          const hasLocalConflict = entries.some(entry => 
            entry.timeSlot.day === day && entry.timeSlot.period === period
          );
          
          // We no longer consider global faculty schedule here so sections are independent
          return !hasLocalConflict;
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
          // We no longer record in global schedule so sections can reuse faculty slots independently
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
      
      const batchALab = shuffledLabSubjects[batchALabIndex];
      const batchBLab = shuffledLabSubjects[batchBLabIndex];
      
      // Check if both labs are already allocated
      if (batchAAllocated.has(batchALab.subject.name) && batchBAllocated.has(batchBLab.subject.name)) {
        // Try to find unallocated labs
        const unallocatedA = shuffledLabSubjects.find(ls => !batchAAllocated.has(ls.subject.name));
        const unallocatedB = shuffledLabSubjects.find(ls => 
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
        labA = shuffledLabSubjects.find(ls => !batchAAllocated.has(ls.subject.name)) || labA;
      }
      
      if (batchBAllocated.has(labB.subject.name) || labB.subject.name === labA.subject.name) {
        labB = shuffledLabSubjects.find(ls => 
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
    
    if (batchAAllocated.size < shuffledLabSubjects.length) {
      console.warn(`Missing labs for Batch A: ${shuffledLabSubjects.filter(ls => !batchAAllocated.has(ls.subject.name)).map(ls => ls.subject.name).join(', ')}`);
    }
    
    if (batchBAllocated.size < shuffledLabSubjects.length) {
      console.warn(`Missing labs for Batch B: ${shuffledLabSubjects.filter(ls => !batchBAllocated.has(ls.subject.name)).map(ls => ls.subject.name).join(', ')}`);
    }
    
    // Update weekly counts
    shuffledLabSubjects.forEach(ls => {
      const countA = batchAAllocated.has(ls.subject.name) ? 1 : 0;
      const countB = batchBAllocated.has(ls.subject.name) ? 1 : 0;
      subjectWeeklyCount.set(ls.subject.name, (countA + countB) * 3);
    });
  };

  allocateLabs();

  // Smart theory allocation - allocate exactly periodsPerWeek for each subject
  const allocateTheorySubjects = () => {
    // Identify days that have labs (3 continuous lab periods)
    const labDays = new Set<string>();
    daysOfWeek.forEach(day => {
      const labEntriesOnDay = entries.filter(entry => 
        entry.timeSlot.day === day && entry.subjectType === 'lab'
      );
      if (labEntriesOnDay.length >= 3) {
        labDays.add(day);
      }
    });
    
    console.log(`Lab days identified: ${Array.from(labDays).join(', ')}`);

    const availableSlots = timeSlots.filter(slot => {
      return !entries.some(entry => 
        entry.timeSlot.day === slot.day && 
        entry.timeSlot.period === slot.period
      );
    });

    // Track how many periods allocated for each theory subject
    const theoryPeriodsAllocated = new Map<string, number>();
    shuffledTheorySubjects.forEach(ts => theoryPeriodsAllocated.set(ts.subject.name, 0));
    
    // Track which day each continuous subject is assigned to
    const continuousSubjectDay = new Map<string, string>();
    
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

    // Helper to find N continuous available periods on a day
    const findContinuousPeriods = (day: string, count: number, facultyId: string) => {
      const daySlots = slotsByDay.get(day) || [];
      const availablePeriods = daySlots.map(s => s.period).sort((a, b) => a - b);
      
      for (let i = 0; i <= availablePeriods.length - count; i++) {
        const consecutive = [];
        for (let j = 0; j < count; j++) {
          if (availablePeriods[i + j] === availablePeriods[i] + j) {
            // Check if faculty is free
            const slotKey = `${day}-${availablePeriods[i + j]}`;
            if (!facultySchedule.get(facultyId)?.has(slotKey)) {
              consecutive.push(availablePeriods[i + j]);
            } else {
              break;
            }
          } else {
            break;
          }
        }
        if (consecutive.length === count) {
          return consecutive;
        }
      }
      return null;
    };

    // First, pre-allocate continuous subjects with 3+ periods to avoid lab days
    const continuousSubjects3Plus = shuffledTheorySubjects.filter(
      ts => ts.subject.allocation === 'continuous' && (ts.subject.continuousPeriods || ts.subject.periodsPerWeek) >= 3
    );
    
    continuousSubjects3Plus.forEach(({ faculty, subject }) => {
      const continuousCount = subject.continuousPeriods || subject.periodsPerWeek;
      // Find a non-lab day for this subject
      const nonLabDays = daysOfWeek.filter(day => !labDays.has(day));
      const shuffledNonLabDays = rng.shuffle([...nonLabDays]);
      
      // Also consider lab days as fallback
      const allDaysToTry = [...shuffledNonLabDays, ...Array.from(labDays)];
      
      for (const day of allDaysToTry) {
        const periods = findContinuousPeriods(day, continuousCount, faculty.id);
        
        if (periods) {
          // Allocate all continuous periods on this day
          periods.forEach(period => {
            const slot = timeSlots.find(s => s.day === day && s.period === period);
            if (slot) {
              const slotKey = `${day}-${period}`;
              facultySchedule.get(faculty.id)?.add(slotKey);
              dailySubjectUsage.get(day)?.add(subject.name);
              periodSubjectUsage.get(period)?.add(subject.name);
              
              theoryPeriodsAllocated.set(
                subject.name, 
                (theoryPeriodsAllocated.get(subject.name) || 0) + 1
              );
              subjectWeeklyCount.set(
                subject.name, 
                (subjectWeeklyCount.get(subject.name) || 0) + 1
              );
              
              const dailyMap = subjectDailyCount.get(subject.name);
              if (dailyMap) {
                dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
              }
              
              entries.push({
                id: `${day}-${period}-${faculty.id}`,
                timeSlot: slot,
                facultyId: faculty.id,
                facultyName: faculty.name,
                subject: subject.name,
                subjectType: 'theory'
              });
              
              // Remove from available slots
              const slotIndex = (slotsByDay.get(day) || []).findIndex(s => s.period === period);
              if (slotIndex !== -1) {
                slotsByDay.get(day)?.splice(slotIndex, 1);
              }
            }
          });
          
          continuousSubjectDay.set(subject.name, day);
          console.log(`Pre-allocated ${subject.name} (${continuousCount} continuous) on ${day} (non-lab day: ${!labDays.has(day)})`);
          break;
        }
      }
    });

    // Now handle continuous subjects with less than 3 periods
    const continuousSubjectsLess3 = shuffledTheorySubjects.filter(
      ts => ts.subject.allocation === 'continuous' && (ts.subject.continuousPeriods || ts.subject.periodsPerWeek) < 3 && (ts.subject.continuousPeriods || ts.subject.periodsPerWeek) > 1
    );
    
    continuousSubjectsLess3.forEach(({ faculty, subject }) => {
      if (isSubjectComplete(subject.name, subject.periodsPerWeek)) return;
      
      const continuousCount = subject.continuousPeriods || subject.periodsPerWeek;
      const shuffledDays = rng.shuffle([...daysOfWeek]);
      
      for (const day of shuffledDays) {
        const periods = findContinuousPeriods(day, continuousCount, faculty.id);
        
        if (periods) {
          periods.forEach(period => {
            const slot = timeSlots.find(s => s.day === day && s.period === period);
            if (slot) {
              const slotKey = `${day}-${period}`;
              facultySchedule.get(faculty.id)?.add(slotKey);
              dailySubjectUsage.get(day)?.add(subject.name);
              periodSubjectUsage.get(period)?.add(subject.name);
              
              theoryPeriodsAllocated.set(
                subject.name, 
                (theoryPeriodsAllocated.get(subject.name) || 0) + 1
              );
              subjectWeeklyCount.set(
                subject.name, 
                (subjectWeeklyCount.get(subject.name) || 0) + 1
              );
              
              const dailyMap = subjectDailyCount.get(subject.name);
              if (dailyMap) {
                dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
              }
              
              entries.push({
                id: `${day}-${period}-${faculty.id}`,
                timeSlot: slot,
                facultyId: faculty.id,
                facultyName: faculty.name,
                subject: subject.name,
                subjectType: 'theory'
              });
              
              const slotIndex = (slotsByDay.get(day) || []).findIndex(s => s.period === period);
              if (slotIndex !== -1) {
                slotsByDay.get(day)?.splice(slotIndex, 1);
              }
            }
          });
          
          continuousSubjectDay.set(subject.name, day);
          console.log(`Pre-allocated ${subject.name} (${continuousCount} continuous) on ${day}`);
          break;
        }
      }
    });

    // Allocate remaining periods for continuous subjects (if periodsPerWeek > continuousPeriods)
    // and all periods for random subjects
    daysOfWeek.forEach(day => {
      const daySlots = slotsByDay.get(day) || [];
      const dayUsage = dailySubjectUsage.get(day) || new Set();
      
      daySlots.forEach(slot => {
        const slotKey = `${slot.day}-${slot.period}`;
        const periodUsage = periodSubjectUsage.get(slot.period) || new Set();
        
        // Check if this slot is already allocated
        const isSlotTaken = entries.some(e => 
          e.timeSlot.day === slot.day && e.timeSlot.period === slot.period
        );
        if (isSlotTaken) return;
        
        // Find best subject that hasn't reached its required periods
        const findBestSubject = () => {
          // Filter subjects that still need allocation
          const needsAllocation = shuffledTheorySubjects.filter(({subject}) => 
            !isSubjectComplete(subject.name, subject.periodsPerWeek)
          );
          
          if (needsAllocation.length === 0) return null;
          
          // For continuous allocation, prioritize continuing subjects
          const continuousSubjects = needsAllocation.filter(({faculty, subject}) => {
            if (subject.allocation !== 'continuous') return false;
            const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
            const isContinuous = isSubjectContinuous(slot, subject.name);
            return isFacultyFree && isContinuous;
          });
          
          if (continuousSubjects.length > 0) return continuousSubjects[0];
          
          // Priority 1: New subject for period and day
          let candidates = needsAllocation.filter(({faculty, subject}) => {
            const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
            const notUsedInPeriod = !periodUsage.has(subject.name);
            const notUsedToday = !dayUsage.has(subject.name);
            const continuousCheck = subject.allocation === 'random' ? !isSubjectContinuous(slot, subject.name) : true;
            
            return isFacultyFree && notUsedInPeriod && notUsedToday && continuousCheck;
          });
          
          if (candidates.length === 0) {
            // Priority 2: New subject for period
            candidates = needsAllocation.filter(({faculty, subject}) => {
              const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
              const notUsedInPeriod = !periodUsage.has(subject.name);
              const continuousCheck = subject.allocation === 'random' ? !isSubjectContinuous(slot, subject.name) : true;
              
              return isFacultyFree && notUsedInPeriod && continuousCheck;
            });
          }
          
          if (candidates.length === 0) {
            // Priority 3: Faculty free within this class timetable
            candidates = needsAllocation.filter(({faculty, subject}) => {
              const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
              const continuousCheck = subject.allocation === 'random' ? !isSubjectContinuous(slot, subject.name) : true;
              
              return isFacultyFree && continuousCheck;
            });
          }
          
          if (candidates.length === 0) {
            // Priority 4: Just faculty free (fallback)
            candidates = needsAllocation.filter(({faculty}) => {
              const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
              return isFacultyFree;
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
          // Only check local faculty schedule so each class/section timetable is independent
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