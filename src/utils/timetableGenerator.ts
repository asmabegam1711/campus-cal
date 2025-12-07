import { Faculty, TimeSlot, TimetableEntry, GeneratedTimetable, Subject, AllocationWarning } from '@/types/timetable';
import GlobalScheduleManager from './globalScheduleManager';

// Track allocation warnings for reporting
let allocationWarnings: AllocationWarning[] = [];

// Enhanced deterministic hash for better variation between classes/sections
const hashStringToNumber = (value: string): number => {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
    hash = hash >>> 0;
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
    slots.push({ day, period: 1, startTime: '9:00 AM', endTime: '9:50 AM', type: 'class' });
    slots.push({ day, period: 2, startTime: '9:50 AM', endTime: '10:40 AM', type: 'class' });
    slots.push({ day, period: 0, startTime: '10:40 AM', endTime: '10:55 AM', type: 'break' });
    slots.push({ day, period: 3, startTime: '10:55 AM', endTime: '11:45 AM', type: 'class' });
    slots.push({ day, period: 4, startTime: '11:45 AM', endTime: '12:35 PM', type: 'class' });
    slots.push({ day, period: 0, startTime: '12:35 PM', endTime: '1:15 PM', type: 'lunch' });
    slots.push({ day, period: 5, startTime: '1:15 PM', endTime: '2:05 PM', type: 'class' });
    slots.push({ day, period: 6, startTime: '2:05 PM', endTime: '2:55 PM', type: 'class' });
    slots.push({ day, period: 0, startTime: '2:55 PM', endTime: '3:10 PM', type: 'break' });
    slots.push({ day, period: 7, startTime: '3:10 PM', endTime: '4:00 PM', type: 'class' });
    slots.push({ day, period: 8, startTime: '4:00 PM', endTime: '4:50 PM', type: 'class' });
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
  
  // Reset allocation warnings
  allocationWarnings = [];
  
  // Get global schedule manager
  const globalScheduleManager = GlobalScheduleManager.getInstance();
  
  // Clear previous assignments for this class before regenerating
  globalScheduleManager.removeClassAssignments(className, year, section, semester);
  
  // Create seeded random generator for unique ordering per section
  const classKey = `${className}-${year}-${section}-${semester}`;
  const seed = hashStringToNumber(classKey);
  const rng = new SeededRandom(seed);
  
  const daysOfWeek: Array<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'> = 
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const maxPeriods = 8;
  
  // Create 2D timetable grid [day][period] to track what's allocated
  const timetable: (string | null)[][] = [];
  const assignedFaculty: (string | null)[][] = [];
  const assignedBatch: (string | null)[][] = [];
  
  for (let d = 0; d < daysOfWeek.length; d++) {
    timetable[d] = [];
    assignedFaculty[d] = [];
    assignedBatch[d] = [];
    for (let p = 0; p < maxPeriods; p++) {
      timetable[d][p] = null;
      assignedFaculty[d][p] = null;
      assignedBatch[d][p] = null;
    }
  }
  
  // Group subjects by type
  const allSubjects: Array<{faculty: Faculty, subject: Subject}> = [];
  faculties.forEach(faculty => {
    faculty.subjects.forEach(subject => {
      allSubjects.push({ faculty, subject });
    });
  });
  
  const labSubjects = rng.shuffle(allSubjects.filter(s => s.subject.type === 'lab'));
  const theorySubjects = rng.shuffle(allSubjects.filter(s => s.subject.type === 'theory'));
  
  console.log(`\n========== GENERATING TIMETABLE FOR ${className}-${year}-${section}-${semester} ==========`);
  
  // ========== STEP 1: ALLOCATE LABS (3 continuous periods per batch) ==========
  const allocateLabs = () => {
    if (labSubjects.length === 0) return;
    
    console.log(`\n--- Allocating ${labSubjects.length} lab subjects ---`);
    
    // Valid 3-period continuous slots
    const validLabSlots = [
      [1, 2, 3],
      [5, 6, 7],
      [6, 7, 8],
    ];
    
    // Track which labs are allocated for each batch
    const batchAAllocated = new Set<string>();
    const batchBAllocated = new Set<string>();
    
    // Try to allocate each lab for both batches
    labSubjects.forEach(({ faculty, subject }) => {
      // Allocate for Batch A
      if (!batchAAllocated.has(subject.name)) {
        let placed = false;
        
        for (let d = 0; d < daysOfWeek.length && !placed; d++) {
          const day = daysOfWeek[d];
          
          for (const slotPeriods of validLabSlots) {
            // Check if all 3 periods are free locally
            const allLocalFree = slotPeriods.every(p => timetable[d][p - 1] === null);
            if (!allLocalFree) continue;
            
            // Check if faculty is globally available for all 3 periods
            globalScheduleManager.loadFromStorage();
            const allGlobalFree = slotPeriods.every(p => 
              globalScheduleManager.isFacultyAvailable(faculty.id, day, p)
            );
            
            if (!allGlobalFree) {
              console.log(`[LAB CLASH] ${subject.name} - Faculty ${faculty.id} busy on ${day} periods ${slotPeriods.join(',')}`);
              continue;
            }
            
            // Allocate all 3 periods
            let allAdded = true;
            slotPeriods.forEach((period, idx) => {
              const added = globalScheduleManager.addFacultyAssignment(
                faculty.id, day, period, className, year, section, semester
              );
              if (!added) {
                allAdded = false;
                return;
              }
              
              timetable[d][period - 1] = subject.name;
              assignedFaculty[d][period - 1] = faculty.id;
              assignedBatch[d][period - 1] = 'A';
              
              const timeSlot = timeSlots.find(s => s.day === day && s.period === period);
              if (timeSlot) {
                entries.push({
                  id: `${day}-${period}-${faculty.id}-A`,
                  timeSlot,
                  facultyId: faculty.id,
                  facultyName: faculty.name,
                  subject: subject.name,
                  subjectType: 'lab',
                  batch: 'A',
                  isLabContinuation: idx > 0
                });
              }
            });
            
            if (allAdded) {
              batchAAllocated.add(subject.name);
              console.log(`✓ LAB (Batch A): ${subject.name} → ${day} periods ${slotPeriods.join(',')}`);
              placed = true;
            }
            break;
          }
        }
        
        if (!placed) {
          console.error(`❌ Cannot place lab ${subject.name} for Batch A - no safe slot found`);
        }
      }
      
      // Allocate for Batch B
      if (!batchBAllocated.has(subject.name)) {
        let placed = false;
        
        for (let d = 0; d < daysOfWeek.length && !placed; d++) {
          const day = daysOfWeek[d];
          
          for (const slotPeriods of validLabSlots) {
            // For Batch B, we can share the same slot with Batch A (different batch)
            // But faculty must still be globally available
            
            // Check if this slot is either: 
            // 1. Empty, OR
            // 2. Has Batch A of SAME lab (not allowed - same lab same time)
            // 3. Has Batch A of DIFFERENT lab (allowed - parallel labs)
            
            const slotStatus = slotPeriods.map(p => ({
              period: p,
              subject: timetable[d][p - 1],
              batch: assignedBatch[d][p - 1],
              faculty: assignedFaculty[d][p - 1]
            }));
            
            // Check if all periods have the same status
            const allEmpty = slotStatus.every(s => s.subject === null);
            const allSameBatchDiffLab = slotStatus.every(s => 
              s.batch === 'A' && s.subject !== subject.name
            );
            
            if (!allEmpty && !allSameBatchDiffLab) continue;
            
            // Check if faculty is globally available
            globalScheduleManager.loadFromStorage();
            const allGlobalFree = slotPeriods.every(p => 
              globalScheduleManager.isFacultyAvailable(faculty.id, day, p)
            );
            
            if (!allGlobalFree) {
              console.log(`[LAB CLASH] ${subject.name} (Batch B) - Faculty ${faculty.id} busy on ${day} periods ${slotPeriods.join(',')}`);
              continue;
            }
            
            // Allocate
            let allAdded = true;
            slotPeriods.forEach((period, idx) => {
              const added = globalScheduleManager.addFacultyAssignment(
                faculty.id, day, period, className, year, section, semester
              );
              if (!added) {
                allAdded = false;
                return;
              }
              
              // Only update local grid if it was empty (don't overwrite Batch A)
              if (timetable[d][period - 1] === null) {
                timetable[d][period - 1] = subject.name;
                assignedFaculty[d][period - 1] = faculty.id;
                assignedBatch[d][period - 1] = 'B';
              }
              
              const timeSlot = timeSlots.find(s => s.day === day && s.period === period);
              if (timeSlot) {
                entries.push({
                  id: `${day}-${period}-${faculty.id}-B`,
                  timeSlot,
                  facultyId: faculty.id,
                  facultyName: faculty.name,
                  subject: subject.name,
                  subjectType: 'lab',
                  batch: 'B',
                  isLabContinuation: idx > 0
                });
              }
            });
            
            if (allAdded) {
              batchBAllocated.add(subject.name);
              console.log(`✓ LAB (Batch B): ${subject.name} → ${day} periods ${slotPeriods.join(',')}`);
              placed = true;
            }
            break;
          }
        }
        
        if (!placed) {
          console.error(`❌ Cannot place lab ${subject.name} for Batch B - no safe slot found`);
        }
      }
    });
  };
  
  allocateLabs();
  
  // ========== STEP 2: ALLOCATE THEORY SUBJECTS (EXACT periods, NO clash) ==========
  const allocateTheorySubjects = () => {
    console.log(`\n--- Allocating ${theorySubjects.length} theory subjects ---`);
    
    // Shuffle day order based on section for unique timetables
    const shuffledDays = rng.shuffle([...Array(daysOfWeek.length).keys()]);
    
    theorySubjects.forEach(({ faculty, subject }) => {
      const requiredPeriods = subject.periodsPerWeek;
      let remaining = requiredPeriods;
      
      console.log(`\nAllocating ${subject.name}: ${requiredPeriods} periods needed`);
      
      // Keep allocating until requirement is met
      while (remaining > 0) {
        let placed = false;
        
        // Iterate through days and periods to find a safe slot
        for (let di = 0; di < shuffledDays.length && !placed; di++) {
          const d = shuffledDays[di];
          const day = daysOfWeek[d];
          
          for (let p = 0; p < maxPeriods && !placed; p++) {
            // Skip if already filled
            if (timetable[d][p] !== null) continue;
            
            const period = p + 1; // periods are 1-indexed
            
            // Check global faculty availability
            globalScheduleManager.loadFromStorage();
            const isFacultyFree = globalScheduleManager.isFacultyAvailable(faculty.id, day, period);
            
            if (!isFacultyFree) {
              continue; // Faculty busy, try next slot
            }
            
            // Assign subject
            const added = globalScheduleManager.addFacultyAssignment(
              faculty.id, day, period, className, year, section, semester
            );
            
            if (!added) {
              console.warn(`[ASSIGN FAILED] ${subject.name} - ${day} period ${period}`);
              continue;
            }
            
            timetable[d][p] = subject.name;
            assignedFaculty[d][p] = faculty.id;
            
            const timeSlot = timeSlots.find(s => s.day === day && s.period === period);
            if (timeSlot) {
              entries.push({
                id: `${day}-${period}-${faculty.id}`,
                timeSlot,
                facultyId: faculty.id,
                facultyName: faculty.name,
                subject: subject.name,
                subjectType: 'theory'
              });
            }
            
            remaining--;
            placed = true;
            console.log(`  ✓ ${subject.name} → ${day} period ${period} (${requiredPeriods - remaining}/${requiredPeriods})`);
          }
        }
        
        // If no slot was found in this iteration, subject cannot be fully placed
        if (!placed) {
          console.error(`❌ Cannot place ${subject.name}: Only ${requiredPeriods - remaining}/${requiredPeriods} periods allocated`);
          
          // Add warning
          allocationWarnings.push({
            subjectName: subject.name,
            facultyName: faculty.name,
            facultyId: faculty.id,
            requestedPeriods: requiredPeriods,
            allocatedPeriods: requiredPeriods - remaining,
            reason: `Faculty "${faculty.name}" (${faculty.id}) is already assigned to other sections during available time slots`
          });
          
          break; // Exit while loop for this subject
        }
      }
      
      if (remaining === 0) {
        console.log(`  ✓ ${subject.name}: ALL ${requiredPeriods} periods allocated successfully`);
      }
    });
  };
  
  allocateTheorySubjects();
  
  // ========== FINAL LOGGING ==========
  console.log(`\n========== TIMETABLE COMPLETE ==========`);
  console.log(`Total entries: ${entries.length}`);
  console.log(`Warnings: ${allocationWarnings.length}`);
  
  return {
    id: Date.now().toString(),
    className,
    year,
    section,
    semester,
    entries: entries.sort((a, b) => {
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

export const getLastAllocationWarnings = (): AllocationWarning[] => {
  return [...allocationWarnings];
};
