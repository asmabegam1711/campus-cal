import { Faculty, TimeSlot, TimetableEntry, GeneratedTimetable, Subject } from '@/types/timetable';

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
  const subjectPeriodsAllocated: Map<string, number> = new Map();

  // Initialize faculty schedule tracking
  faculties.forEach(faculty => {
    facultySchedule.set(faculty.id, new Set());
    faculty.subjects.forEach(subject => {
      subjectPeriodsAllocated.set(`${faculty.id}-${subject.name}`, 0);
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

  // First allocate lab sessions (3 continuous periods)
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  labSubjects.forEach(({faculty, subject}) => {
    const subjectKey = `${faculty.id}-${subject.name}`;
    const requiredSessions = Math.ceil(subject.periodsPerWeek / 3);
    let allocatedSessions = 0;

    for (const day of daysOfWeek) {
      if (allocatedSessions >= requiredSessions) break;
      
      // Try to find 3 continuous periods
      for (let startPeriod = 1; startPeriod <= 6; startPeriod++) {
        if (allocatedSessions >= requiredSessions) break;
        
        const periodsNeeded = [startPeriod, startPeriod + 1, startPeriod + 2];
        
        // Check if all 3 periods are available and valid
        const canAllocate = periodsNeeded.every(period => {
          if (period > 8) return false;
          const slotKey = `${day}-${period}`;
          return !facultySchedule.get(faculty.id)?.has(slotKey);
        });

        if (canAllocate) {
          // Allocate lab session with batch splitting
          const batches: Array<'A' | 'B'> = ['A', 'B'];
          
          periodsNeeded.forEach((period, index) => {
            const slotKey = `${day}-${period}`;
            const timeSlot = timeSlots.find(slot => slot.day === day && slot.period === period);
            
            if (timeSlot) {
              batches.forEach(batch => {
                entries.push({
                  id: `${day}-${period}-${faculty.id}-${batch}`,
                  timeSlot,
                  facultyId: faculty.id,
                  facultyName: faculty.name,
                  subject: subject.name,
                  subjectType: 'lab',
                  batch,
                  classRoom: `Lab ${Math.floor(Math.random() * 10) + 1}${batch}`,
                  isLabContinuation: index > 0
                });
              });
              
              facultySchedule.get(faculty.id)?.add(slotKey);
            }
          });
          
          allocatedSessions++;
          subjectPeriodsAllocated.set(subjectKey, (subjectPeriodsAllocated.get(subjectKey) || 0) + 3);
        }
      }
    }
  });

  // Then allocate theory sessions - improved algorithm
  const availableSlots = timeSlots.filter(slot => {
    const slotKey = `${slot.day}-${slot.period}`;
    return !entries.some(entry => 
      entry.timeSlot.day === slot.day && 
      entry.timeSlot.period === slot.period
    );
  });

  // Create a weighted list of subjects that need more periods
  const createSubjectPool = () => {
    const pool: Array<{faculty: Faculty, subject: Subject}> = [];
    theorySubjects.forEach(({faculty, subject}) => {
      const subjectKey = `${faculty.id}-${subject.name}`;
      const allocated = subjectPeriodsAllocated.get(subjectKey) || 0;
      const needed = subject.periodsPerWeek - allocated;
      
      // Add subject multiple times based on how many periods it still needs
      for (let i = 0; i < needed; i++) {
        pool.push({faculty, subject});
      }
    });
    return pool.sort(() => Math.random() - 0.5); // Shuffle for randomness
  };

  let subjectPool = createSubjectPool();
  let previousSubject: string | null = null;

  availableSlots.forEach(slot => {
    const slotKey = `${slot.day}-${slot.period}`;
    
    // Refresh subject pool if empty
    if (subjectPool.length === 0) {
      subjectPool = createSubjectPool();
    }
    
    // Find available subjects (faculty not busy, not same as previous period)
    const availableSubjects = subjectPool.filter(({faculty, subject}) => {
      const facultySlotKey = slotKey;
      const isFacultyFree = !facultySchedule.get(faculty.id)?.has(facultySlotKey);
      const isDifferentFromPrevious = subject.name !== previousSubject;
      
      return isFacultyFree && isDifferentFromPrevious;
    });
    
    if (availableSubjects.length > 0) {
      const selected = availableSubjects[0];
      const subjectKey = `${selected.faculty.id}-${selected.subject.name}`;
      
      // Add to faculty schedule
      facultySchedule.get(selected.faculty.id)?.add(slotKey);
      subjectPeriodsAllocated.set(subjectKey, (subjectPeriodsAllocated.get(subjectKey) || 0) + 1);
      previousSubject = selected.subject.name;
      
      // Remove from pool
      const index = subjectPool.findIndex(s => s.faculty.id === selected.faculty.id && s.subject.name === selected.subject.name);
      if (index !== -1) {
        subjectPool.splice(index, 1);
      }
      
      entries.push({
        id: `${slot.day}-${slot.period}-${selected.faculty.id}`,
        timeSlot: slot,
        facultyId: selected.faculty.id,
        facultyName: selected.faculty.name,
        subject: selected.subject.name,
        subjectType: 'theory',
        classRoom: `Room ${Math.floor(Math.random() * 20) + 101}`
      });
    } else {
      previousSubject = null; // Reset if no allocation
    }
  });

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