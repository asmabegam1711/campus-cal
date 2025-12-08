import { Faculty, TimeSlot, TimetableEntry, GeneratedTimetable, Subject, AllocationWarning } from '@/types/timetable';
import GlobalScheduleManager from './globalScheduleManager';

// Track allocation warnings for reporting
let allocationWarnings: AllocationWarning[] = [];

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
  
  // Reset allocation warnings for this generation
  allocationWarnings = [];
  
  // Get global schedule manager instance to prevent cross-section faculty clashes
  const globalScheduleManager = GlobalScheduleManager.getInstance();
  
  // IMPORTANT: Clear previous assignments for this class before regenerating
  // This prevents stale data from blocking new allocations
  globalScheduleManager.removeClassAssignments(className, year, section, semester);
  
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
    
    // Valid 3-period continuous slot options (avoiding breaks/lunch)
    // Best continuous slots: 1-3 (morning), 5-7 (afternoon), 6-8 (late afternoon)
    const validLabSlots = [
      [1, 2, 3],   // Morning slot before first break
      [5, 6, 7],   // Afternoon slot after lunch
      [6, 7, 8],   // Late afternoon slot
      [3, 4, 5],   // Mid-day (spans lunch but works)
      [4, 5, 6],   // Mid-day alternative
    ];
    
    // Helper to find 3 continuous available periods on a day for specific faculty
    const find3ContinuousPeriods = (day: string, facultyIds: string[]) => {
      // Force reload from storage to get latest cross-section assignments
      globalScheduleManager.loadFromStorage();
      
      // Get unique faculty IDs to check
      const uniqueFacultyIds = [...new Set(facultyIds)];
      
      // Try each valid slot combination
      for (const periodsNeeded of validLabSlots) {
        let canAllocate = true;
        
        for (const period of periodsNeeded) {
          // Check if slot is free locally within this class timetable
          const hasLocalConflict = entries.some(entry => 
            entry.timeSlot.day === day && entry.timeSlot.period === period
          );
          
          if (hasLocalConflict) {
            canAllocate = false;
            break;
          }
          
          // Check global faculty availability for ALL faculty members (critical for cross-section clash prevention)
          for (const facultyId of uniqueFacultyIds) {
            const isFacultyFree = globalScheduleManager.isFacultyAvailable(facultyId, day, period);
            if (!isFacultyFree) {
              console.log(`[CLASH DETECTED] Faculty ${facultyId} is NOT available on ${day} period ${period} for ${className}-${section}`);
              canAllocate = false;
              break;
            }
          }
          
          if (!canAllocate) break;
        }

        if (canAllocate) {
          console.log(`[SLOT FOUND] ${day} periods ${periodsNeeded.join(',')} available for faculty: ${uniqueFacultyIds.join(', ')} in ${className}-${section}`);
          return { startPeriod: periodsNeeded[0], periodsNeeded };
        }
      }
      
      console.log(`[NO SLOT] Could not find available slot on ${day} for faculty: ${uniqueFacultyIds.join(', ')} in ${className}-${section}`);
      return null;
    };
    
    // Helper to allocate a lab session for a batch
    const allocateLabSession = (
      labSubject: {faculty: Faculty, subject: Subject},
      day: string,
      periods: number[],
      batch: 'A' | 'B'
    ): boolean => {
      // Force reload from storage to get latest cross-section assignments
      globalScheduleManager.loadFromStorage();
      
      // First verify all periods are still available (double-check before committing)
      for (const period of periods) {
        const isAvailable = globalScheduleManager.isFacultyAvailable(labSubject.faculty.id, day, period);
        if (!isAvailable) {
          console.warn(`[ALLOCATION BLOCKED] Faculty ${labSubject.faculty.id} NOT available for ${day} period ${period} in ${className}-${section}`);
          return false;
        }
      }
      
      let allPeriodsAdded = true;
      
      periods.forEach((period, periodIndex) => {
        const timeSlot = timeSlots.find(slot => slot.day === day && slot.period === period);
        
        if (timeSlot) {
          // Register in global schedule to prevent cross-section clashes
          const added = globalScheduleManager.addFacultyAssignment(
            labSubject.faculty.id,
            day,
            period,
            className,
            year,
            section,
            semester
          );
          
          if (!added) {
            console.warn(`[GLOBAL ASSIGNMENT FAILED] Faculty ${labSubject.faculty.id} on ${day} period ${period} for ${className}-${section}`);
            allPeriodsAdded = false;
            return;
          }
          
          console.log(`[LAB ASSIGNED] ${labSubject.subject.name} (Batch ${batch}) - Faculty ${labSubject.faculty.id} on ${day} period ${period} for ${className}-${section}`);
          
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
      return allPeriodsAdded;
    };
    
    // First, allocate labs with preferred days
    const labsWithPreferredDay = shuffledLabSubjects.filter(ls => ls.subject.preferredDay);
    const labsWithoutPreferredDay = shuffledLabSubjects.filter(ls => !ls.subject.preferredDay);
    
    // Allocate labs with preferred days first
    labsWithPreferredDay.forEach(labSubject => {
      const preferredDay = labSubject.subject.preferredDay!;
      console.log(`[PREFERRED DAY LAB] ${labSubject.subject.name} must be allocated on ${preferredDay}`);
      
      const slot = find3ContinuousPeriods(preferredDay, [labSubject.faculty.id]);
      
      if (slot) {
        // Allocate for both batches on the same day
        const allocatedA = allocateLabSession(labSubject, preferredDay, slot.periodsNeeded, 'A');
        if (allocatedA) {
          batchAAllocated.add(labSubject.subject.name);
        }
        
        // Find another slot on the same day for batch B
        const slotB = find3ContinuousPeriods(preferredDay, [labSubject.faculty.id]);
        if (slotB) {
          const allocatedB = allocateLabSession(labSubject, preferredDay, slotB.periodsNeeded, 'B');
          if (allocatedB) {
            batchBAllocated.add(labSubject.subject.name);
          }
        } else {
          console.warn(`Could not find second slot on ${preferredDay} for ${labSubject.subject.name} Batch B`);
          allocationWarnings.push({
            subjectName: labSubject.subject.name,
            facultyName: labSubject.faculty.name,
            facultyId: labSubject.faculty.id,
            requestedPeriods: 3,
            allocatedPeriods: 3,
            reason: `Batch B could not be allocated on preferred day (${preferredDay}) - no available continuous slots`
          });
        }
      } else {
        console.warn(`Could not find slot on preferred day ${preferredDay} for ${labSubject.subject.name}`);
        allocationWarnings.push({
          subjectName: labSubject.subject.name,
          facultyName: labSubject.faculty.name,
          facultyId: labSubject.faculty.id,
          requestedPeriods: 6,
          allocatedPeriods: 0,
          reason: `Could not allocate on preferred day (${preferredDay}) - faculty conflict or no available continuous slots`
        });
      }
    });
    
    // Rotation pattern for remaining lab allocation (labs without preferred days)
    // For N labs, we need N days where each batch does each lab exactly once
    // Day i: Batch A does Lab i, Batch B does Lab (i + offset) % N
    let dayIndex = 0;
    
    for (let i = 0; i < labsWithoutPreferredDay.length && dayIndex < labDays.length; i++) {
      const day = labDays[dayIndex];
      
      // Skip if this lab is already allocated (had preferred day)
      const labA = labsWithoutPreferredDay[i];
      if (batchAAllocated.has(labA.subject.name) && batchBAllocated.has(labA.subject.name)) {
        continue;
      }
      
      // Calculate which labs to assign on this day
      const batchBLabIndex = (i + Math.floor(labsWithoutPreferredDay.length / 2) + (labsWithoutPreferredDay.length % 2)) % labsWithoutPreferredDay.length;
      const labB = labsWithoutPreferredDay[batchBLabIndex];
      
      // Check if both labs are already allocated
      if (batchAAllocated.has(labA.subject.name) && batchBAllocated.has(labB.subject.name)) {
        // Try to find unallocated labs
        const unallocatedA = labsWithoutPreferredDay.find(ls => !batchAAllocated.has(ls.subject.name));
        const unallocatedB = labsWithoutPreferredDay.find(ls => 
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
      let allocLabA = labA;
      let allocLabB = labB;
      
      // Skip if already allocated
      if (batchAAllocated.has(allocLabA.subject.name)) {
        allocLabA = labsWithoutPreferredDay.find(ls => !batchAAllocated.has(ls.subject.name)) || allocLabA;
      }
      
      if (batchBAllocated.has(allocLabB.subject.name) || allocLabB.subject.name === allocLabA.subject.name) {
        allocLabB = labsWithoutPreferredDay.find(ls => 
          !batchBAllocated.has(ls.subject.name) && ls.subject.name !== allocLabA.subject.name
        ) || allocLabB;
      }
      
      // If we're trying to allocate the same lab to both batches, skip
      if (allocLabA.subject.name === allocLabB.subject.name) {
        dayIndex++;
        continue;
      }
      
      const facultyIds = [allocLabA.faculty.id, allocLabB.faculty.id];
      const slot = find3ContinuousPeriods(day, facultyIds);
      
      if (slot) {
        // Allocate labs for both batches on same periods
        if (!batchAAllocated.has(allocLabA.subject.name)) {
          allocateLabSession(allocLabA, day, slot.periodsNeeded, 'A');
          batchAAllocated.add(allocLabA.subject.name);
        }
        
        if (!batchBAllocated.has(allocLabB.subject.name)) {
          allocateLabSession(allocLabB, day, slot.periodsNeeded, 'B');
          batchBAllocated.add(allocLabB.subject.name);
        }
        
        console.log(`Day ${day}: Batch A → ${allocLabA.subject.name}, Batch B → ${allocLabB.subject.name}`);
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
            const period = availablePeriods[i + j];
            const slotKey = `${day}-${period}`;
            // Check local faculty schedule
            const isLocallyFree = !facultySchedule.get(facultyId)?.has(slotKey);
            // Check global faculty availability across all sections
            const isGloballyFree = globalScheduleManager.isFacultyAvailable(facultyId, day, period);
            
            if (isLocallyFree && isGloballyFree) {
              consecutive.push(period);
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
      
      // Determine which days to try based on preferred day
      let daysToTry: string[];
      if (subject.preferredDay) {
        // If preferred day is set, ONLY try that day (strict requirement)
        daysToTry = [subject.preferredDay];
        console.log(`[PREFERRED DAY] ${subject.name} must be allocated on ${subject.preferredDay}`);
      } else {
        // Find a non-lab day for this subject
        const nonLabDays = daysOfWeek.filter(day => !labDays.has(day));
        const shuffledNonLabDays = rng.shuffle([...nonLabDays]);
        // Also consider lab days as fallback
        daysToTry = [...shuffledNonLabDays, ...Array.from(labDays)];
      }
      
      let allocated = false;
      for (const day of daysToTry) {
        const periods = findContinuousPeriods(day, continuousCount, faculty.id);
        
        if (periods) {
          // Allocate all continuous periods on this day
          let allPeriodsAllocated = true;
          periods.forEach(period => {
            const slot = timeSlots.find(s => s.day === day && s.period === period);
            if (slot) {
              const slotKey = `${day}-${period}`;
              
              // Register in global schedule to prevent cross-section clashes
              const added = globalScheduleManager.addFacultyAssignment(
                faculty.id,
                day,
                period,
                className,
                year,
                section,
                semester
              );
              
              if (!added) {
                console.warn(`Skipping ${subject.name} on ${day} period ${period} - faculty conflict`);
                allPeriodsAllocated = false;
                return; // Skip this period if faculty is not available
              }
              
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
          
          if (allPeriodsAllocated) {
            continuousSubjectDay.set(subject.name, day);
            console.log(`Pre-allocated ${subject.name} (${continuousCount} continuous) on ${day} (preferred: ${subject.preferredDay || 'any'})`);
            allocated = true;
            break;
          }
        }
      }
      
      if (!allocated && subject.preferredDay) {
        // If preferred day was set but couldn't allocate, add warning
        allocationWarnings.push({
          subjectName: subject.name,
          facultyName: faculty.name,
          facultyId: faculty.id,
          requestedPeriods: subject.periodsPerWeek,
          allocatedPeriods: theoryPeriodsAllocated.get(subject.name) || 0,
          reason: `Could not allocate on preferred day (${subject.preferredDay}) - faculty conflict or no available continuous slots`
        });
      }
    });

    // Now handle continuous subjects with less than 3 periods
    const continuousSubjectsLess3 = shuffledTheorySubjects.filter(
      ts => ts.subject.allocation === 'continuous' && (ts.subject.continuousPeriods || ts.subject.periodsPerWeek) < 3 && (ts.subject.continuousPeriods || ts.subject.periodsPerWeek) > 1
    );
    
    continuousSubjectsLess3.forEach(({ faculty, subject }) => {
      if (isSubjectComplete(subject.name, subject.periodsPerWeek)) return;
      
      const continuousCount = subject.continuousPeriods || subject.periodsPerWeek;
      
      // Determine which days to try based on preferred day
      let daysToTry: string[];
      if (subject.preferredDay) {
        // If preferred day is set, ONLY try that day (strict requirement)
        daysToTry = [subject.preferredDay];
        console.log(`[PREFERRED DAY] ${subject.name} must be allocated on ${subject.preferredDay}`);
      } else {
        daysToTry = rng.shuffle([...daysOfWeek]);
      }
      
      let allocated = false;
      for (const day of daysToTry) {
        const periods = findContinuousPeriods(day, continuousCount, faculty.id);
        
        if (periods) {
          let allAllocated = true;
          periods.forEach(period => {
            const slot = timeSlots.find(s => s.day === day && s.period === period);
            if (slot) {
              const slotKey = `${day}-${period}`;
              
              // Register in global schedule to prevent cross-section clashes
              const added = globalScheduleManager.addFacultyAssignment(
                faculty.id,
                day,
                period,
                className,
                year,
                section,
                semester
              );
              
              if (!added) {
                console.warn(`Skipping ${subject.name} on ${day} period ${period} - faculty conflict`);
                allAllocated = false;
                return;
              }
              
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
          
          if (allAllocated) {
            continuousSubjectDay.set(subject.name, day);
            console.log(`Pre-allocated ${subject.name} (${continuousCount} continuous) on ${day} (preferred: ${subject.preferredDay || 'any'})`);
            allocated = true;
            break;
          }
        }
      }
      
      if (!allocated && subject.preferredDay) {
        // If preferred day was set but couldn't allocate, add warning
        allocationWarnings.push({
          subjectName: subject.name,
          facultyName: faculty.name,
          facultyId: faculty.id,
          requestedPeriods: subject.periodsPerWeek,
          allocatedPeriods: theoryPeriodsAllocated.get(subject.name) || 0,
          reason: `Could not allocate on preferred day (${subject.preferredDay}) - faculty conflict or no available continuous slots`
        });
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
          
          // Check both local and global faculty availability
          const isFacultyAvailable = (facultyId: string, day: string, period: number) => {
            const localKey = `${day}-${period}`;
            const isLocallyFree = !facultySchedule.get(facultyId)?.has(localKey);
            const isGloballyFree = globalScheduleManager.isFacultyAvailable(facultyId, day, period);
            return isLocallyFree && isGloballyFree;
          };
          
          // Priority 1: New subject for period and day
          let candidates = needsAllocation.filter(({faculty, subject}) => {
            const isFree = isFacultyAvailable(faculty.id, slot.day, slot.period);
            const notUsedInPeriod = !periodUsage.has(subject.name);
            const notUsedToday = !dayUsage.has(subject.name);
            const continuousCheck = subject.allocation === 'random' ? !isSubjectContinuous(slot, subject.name) : true;
            
            return isFree && notUsedInPeriod && notUsedToday && continuousCheck;
          });
          
          if (candidates.length === 0) {
            // Priority 2: New subject for period
            candidates = needsAllocation.filter(({faculty, subject}) => {
              const isFree = isFacultyAvailable(faculty.id, slot.day, slot.period);
              const notUsedInPeriod = !periodUsage.has(subject.name);
              const continuousCheck = subject.allocation === 'random' ? !isSubjectContinuous(slot, subject.name) : true;
              
              return isFree && notUsedInPeriod && continuousCheck;
            });
          }
          
          if (candidates.length === 0) {
            // Priority 3: Faculty free both locally and globally
            candidates = needsAllocation.filter(({faculty, subject}) => {
              const isFree = isFacultyAvailable(faculty.id, slot.day, slot.period);
              const continuousCheck = subject.allocation === 'random' ? !isSubjectContinuous(slot, subject.name) : true;
              
              return isFree && continuousCheck;
            });
          }
          
          if (candidates.length === 0) {
            // Priority 4: Just faculty free (fallback - still check global)
            candidates = needsAllocation.filter(({faculty}) => {
              return isFacultyAvailable(faculty.id, slot.day, slot.period);
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
          // Register in global schedule to prevent cross-section clashes
          const added = globalScheduleManager.addFacultyAssignment(
            selected.faculty.id,
            slot.day,
            slot.period,
            className,
            year,
            section,
            semester
          );
          
          if (!added) {
            console.warn(`Failed to add ${selected.subject.name} on ${slot.day} period ${slot.period} - faculty ${selected.faculty.id} conflict`);
            return; // Skip this slot, try next
          }
          
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

  // Check for incomplete allocations and generate warnings
  const checkIncompleteAllocations = () => {
    // Check theory subjects
    shuffledTheorySubjects.forEach(({ faculty, subject }) => {
      const allocated = subjectWeeklyCount.get(subject.name) || 0;
      if (allocated < subject.periodsPerWeek) {
        allocationWarnings.push({
          subjectName: subject.name,
          facultyName: faculty.name,
          facultyId: faculty.id,
          requestedPeriods: subject.periodsPerWeek,
          allocatedPeriods: allocated,
          reason: `Faculty "${faculty.name}" (${faculty.id}) is already assigned to other sections during available time slots`
        });
      }
    });

    // Check lab subjects
    shuffledLabSubjects.forEach(({ faculty, subject }) => {
      const allocated = subjectWeeklyCount.get(subject.name) || 0;
      const expectedLabPeriods = subject.periodsPerWeek; // Labs are counted per session
      if (allocated < expectedLabPeriods) {
        allocationWarnings.push({
          subjectName: subject.name,
          facultyName: faculty.name,
          facultyId: faculty.id,
          requestedPeriods: expectedLabPeriods,
          allocatedPeriods: allocated,
          reason: `Faculty "${faculty.name}" (${faculty.id}) has conflicts with other sections for lab sessions`
        });
      }
    });
  };

  checkIncompleteAllocations();

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
    createdBy,
    warnings: allocationWarnings.length > 0 ? allocationWarnings : undefined
  };
};