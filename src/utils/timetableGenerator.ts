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
  const subjectLastAssigned: Map<string, string> = new Map(); // Track last assigned slot for each subject

  // Initialize faculty schedule tracking
  faculties.forEach(faculty => {
    facultySchedule.set(faculty.id, new Set());
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
        }
      }
    }
  });

  // Then allocate theory sessions
  const shuffledTheorySubjects = [...theorySubjects].sort(() => Math.random() - 0.5);
  
  timeSlots.forEach(slot => {
    const slotKey = `${slot.day}-${slot.period}`;
    
    // Skip if slot is already taken by lab
    if (entries.some(entry => 
      entry.timeSlot.day === slot.day && 
      entry.timeSlot.period === slot.period
    )) {
      return;
    }
    
    // Find available theory subjects that don't create continuous allocation
    const availableSubjects = shuffledTheorySubjects.filter(({faculty, subject}) => {
      // Check if faculty is available
      if (facultySchedule.get(faculty.id)?.has(slotKey)) return false;
      
      // Check if subject was allocated in previous period (avoid continuous allocation)
      const prevPeriod = slot.period - 1;
      const prevSlotKey = `${slot.day}-${prevPeriod}`;
      const lastAssigned = subjectLastAssigned.get(subject.name);
      
      return lastAssigned !== prevSlotKey;
    });
    
    if (availableSubjects.length > 0) {
      const selected = availableSubjects[0];
      
      // Add to faculty schedule
      facultySchedule.get(selected.faculty.id)?.add(slotKey);
      subjectLastAssigned.set(selected.subject.name, slotKey);
      
      entries.push({
        id: `${slot.day}-${slot.period}-${selected.faculty.id}`,
        timeSlot: slot,
        facultyId: selected.faculty.id,
        facultyName: selected.faculty.name,
        subject: selected.subject.name,
        subjectType: 'theory',
        classRoom: `Room ${Math.floor(Math.random() * 20) + 101}`
      });
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