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
  const subjectWeeklyCount: Map<string, number> = new Map();
  const dayLabAllocated: Map<string, boolean> = new Map();

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Initialize tracking
  faculties.forEach(faculty => {
    facultySchedule.set(faculty.id, new Set());
    faculty.subjects.forEach(subject => {
      subjectWeeklyCount.set(subject.name, 0);
    });
  });

  // Initialize day lab tracking
  daysOfWeek.forEach(day => {
    dayLabAllocated.set(day, false);
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

  // Allocate one lab per day with batch splitting
  daysOfWeek.forEach((day, dayIndex) => {
    if (labSubjects.length === 0) return;
    
    // Select lab for this day (rotate through available labs)
    const availableLabs = labSubjects.filter(({subject}) => 
      (subjectWeeklyCount.get(subject.name) || 0) < Math.ceil(subject.periodsPerWeek / 3)
    );
    
    if (availableLabs.length === 0) return;
    
    const selectedLab = availableLabs[dayIndex % availableLabs.length];
    
    // Find 3 continuous periods for lab
    for (let startPeriod = 1; startPeriod <= 6; startPeriod++) {
      const periodsNeeded = [startPeriod, startPeriod + 1, startPeriod + 2];
      
      // Check if periods are available
      const canAllocate = periodsNeeded.every(period => {
        if (period > 8) return false;
        const slotKey = `${day}-${period}`;
        return !facultySchedule.get(selectedLab.faculty.id)?.has(slotKey);
      });

      if (canAllocate) {
        // Get another lab subject for batch B if available
        const otherLabs = availableLabs.filter(lab => 
          lab.subject.name !== selectedLab.subject.name &&
          (subjectWeeklyCount.get(lab.subject.name) || 0) < Math.ceil(lab.subject.periodsPerWeek / 3)
        );
        
        const batchBLab = otherLabs.length > 0 ? otherLabs[0] : selectedLab;
        
        periodsNeeded.forEach((period, index) => {
          const slotKey = `${day}-${period}`;
          const timeSlot = timeSlots.find(slot => slot.day === day && slot.period === period);
          
          if (timeSlot) {
            // Batch A - Selected lab
            entries.push({
              id: `${day}-${period}-${selectedLab.faculty.id}-A`,
              timeSlot,
              facultyId: selectedLab.faculty.id,
              facultyName: selectedLab.faculty.name,
              subject: selectedLab.subject.name,
              subjectType: 'lab',
              batch: 'A',
              isLabContinuation: index > 0
            });
            
            // Batch B - Different lab or same lab
            entries.push({
              id: `${day}-${period}-${batchBLab.faculty.id}-B`,
              timeSlot,
              facultyId: batchBLab.faculty.id,
              facultyName: batchBLab.faculty.name,
              subject: batchBLab.subject.name,
              subjectType: 'lab',
              batch: 'B',
              isLabContinuation: index > 0
            });
            
            facultySchedule.get(selectedLab.faculty.id)?.add(slotKey);
            if (batchBLab.faculty.id !== selectedLab.faculty.id) {
              facultySchedule.get(batchBLab.faculty.id)?.add(slotKey);
            }
          }
        });
        
        subjectWeeklyCount.set(selectedLab.subject.name, (subjectWeeklyCount.get(selectedLab.subject.name) || 0) + 1);
        if (batchBLab.subject.name !== selectedLab.subject.name) {
          subjectWeeklyCount.set(batchBLab.subject.name, (subjectWeeklyCount.get(batchBLab.subject.name) || 0) + 1);
        }
        dayLabAllocated.set(day, true);
        break;
      }
    }
  });

  // Allocate theory subjects ensuring all subjects appear weekly
  const availableSlots = timeSlots.filter(slot => {
    return !entries.some(entry => 
      entry.timeSlot.day === slot.day && 
      entry.timeSlot.period === slot.period
    );
  });

  // Create subject pool ensuring weekly distribution
  const createBalancedSubjectPool = () => {
    const pool: Array<{faculty: Faculty, subject: Subject, priority: number}> = [];
    
    theorySubjects.forEach(({faculty, subject}) => {
      const weeklyCount = subjectWeeklyCount.get(subject.name) || 0;
      const targetWeekly = Math.ceil(subject.periodsPerWeek / 6); // Distribute across 6 days
      const priority = targetWeekly - weeklyCount; // Higher priority for subjects with fewer allocations
      
      if (priority > 0) {
        for (let i = 0; i < subject.periodsPerWeek; i++) {
          pool.push({faculty, subject, priority});
        }
      }
    });
    
    return pool.sort((a, b) => b.priority - a.priority || Math.random() - 0.5);
  };

  let subjectPool = createBalancedSubjectPool();
  const dailySubjects: Map<string, Set<string>> = new Map();
  
  // Initialize daily subject tracking
  daysOfWeek.forEach(day => {
    dailySubjects.set(day, new Set());
  });

  availableSlots.forEach(slot => {
    const slotKey = `${slot.day}-${slot.period}`;
    const daySubjectsSet = dailySubjects.get(slot.day) || new Set();
    
    // Refresh subject pool if empty
    if (subjectPool.length === 0) {
      subjectPool = createBalancedSubjectPool();
    }
    
    // Find available subjects (faculty not busy, preferably not allocated today)
    const availableSubjects = subjectPool.filter(({faculty, subject}) => {
      const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
      const notAllocatedToday = !daySubjectsSet.has(subject.name);
      
      return isFacultyFree && (notAllocatedToday || daySubjectsSet.size < theorySubjects.length);
    });
    
    if (availableSubjects.length > 0) {
      // Prefer subjects not allocated today
      const preferredSubjects = availableSubjects.filter(({subject}) => !daySubjectsSet.has(subject.name));
      const selected = preferredSubjects.length > 0 ? preferredSubjects[0] : availableSubjects[0];
      
      // Add to schedule
      facultySchedule.get(selected.faculty.id)?.add(slotKey);
      daySubjectsSet.add(selected.subject.name);
      subjectWeeklyCount.set(selected.subject.name, (subjectWeeklyCount.get(selected.subject.name) || 0) + 1);
      
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