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
  const subjectDailyCount: Map<string, Map<string, number>> = new Map();
  
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

  // Strategic lab allocation - distribute across different days
  const allocateLabs = () => {
    const labAllocationPlan = new Map<string, Array<{faculty: Faculty, subject: Subject}>>();
    
    // Distribute labs across days to avoid clustering
    labSubjects.forEach((lab, index) => {
      const targetDay = daysOfWeek[index % daysOfWeek.length];
      if (!labAllocationPlan.has(targetDay)) {
        labAllocationPlan.set(targetDay, []);
      }
      labAllocationPlan.get(targetDay)!.push(lab);
    });

    // Allocate labs with batch splitting
    labAllocationPlan.forEach((labs, day) => {
      if (labs.length === 0) return;
      
      // Find available 3-period slots for lab
      const findLabSlot = () => {
        for (let startPeriod = 1; startPeriod <= 6; startPeriod++) {
          const periodsNeeded = [startPeriod, startPeriod + 1, startPeriod + 2];
          
          const canAllocate = periodsNeeded.every(period => {
            if (period > 8) return false;
            const slotKey = `${day}-${period}`;
            return !entries.some(entry => 
              entry.timeSlot.day === day && entry.timeSlot.period === period
            );
          });

          if (canAllocate) {
            return { startPeriod, periodsNeeded };
          }
        }
        return null;
      };

      const labSlot = findLabSlot();
      if (!labSlot) return;

      // Select primary lab and secondary lab for batch splitting
      const primaryLab = labs[0];
      const secondaryLab = labs.length > 1 ? labs[1] : primaryLab;
      
      labSlot.periodsNeeded.forEach((period, index) => {
        const timeSlot = timeSlots.find(slot => slot.day === day && slot.period === period);
        
        if (timeSlot) {
          // Batch A - Primary lab
          entries.push({
            id: `${day}-${period}-${primaryLab.faculty.id}-A`,
            timeSlot,
            facultyId: primaryLab.faculty.id,
            facultyName: primaryLab.faculty.name,
            subject: primaryLab.subject.name,
            subjectType: 'lab',
            batch: 'A',
            isLabContinuation: index > 0
          });
          
          // Batch B - Secondary lab
          entries.push({
            id: `${day}-${period}-${secondaryLab.faculty.id}-B`,
            timeSlot,
            facultyId: secondaryLab.faculty.id,
            facultyName: secondaryLab.faculty.name,
            subject: secondaryLab.subject.name,
            subjectType: 'lab',
            batch: 'B',
            isLabContinuation: index > 0
          });
          
          // Mark faculty as busy
          facultySchedule.get(primaryLab.faculty.id)?.add(`${day}-${period}`);
          if (secondaryLab.faculty.id !== primaryLab.faculty.id) {
            facultySchedule.get(secondaryLab.faculty.id)?.add(`${day}-${period}`);
          }
        }
      });
      
      // Update subject counts
      subjectWeeklyCount.set(primaryLab.subject.name, (subjectWeeklyCount.get(primaryLab.subject.name) || 0) + 1);
      if (secondaryLab.subject.name !== primaryLab.subject.name) {
        subjectWeeklyCount.set(secondaryLab.subject.name, (subjectWeeklyCount.get(secondaryLab.subject.name) || 0) + 1);
      }
    });
  };

  allocateLabs();

  // Smart theory allocation - prevent continuous allocation
  const allocateTheorySubjects = () => {
    const availableSlots = timeSlots.filter(slot => {
      return !entries.some(entry => 
        entry.timeSlot.day === slot.day && 
        entry.timeSlot.period === slot.period
      );
    });

    // Create distributed subject pool
    const createSubjectPool = () => {
      const pool: Array<{faculty: Faculty, subject: Subject, priority: number}> = [];
      
      theorySubjects.forEach(({faculty, subject}) => {
        const weeklyCount = subjectWeeklyCount.get(subject.name) || 0;
        const targetWeekly = Math.ceil(subject.periodsPerWeek / 6);
        
        for (let i = 0; i < subject.periodsPerWeek; i++) {
          pool.push({
            faculty, 
            subject, 
            priority: (targetWeekly - weeklyCount) * 10 + Math.random()
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

    // Allocate subjects with anti-clustering logic
    availableSlots.forEach(slot => {
      const slotKey = `${slot.day}-${slot.period}`;
      const dayUsage = dailySubjectUsage.get(slot.day) || new Set();
      
      if (subjectPool.length === 0) {
        subjectPool = createSubjectPool();
      }
      
      // Find best subject avoiding continuous allocation
      const findBestSubject = () => {
        // Priority 1: Subjects not used today
        let candidates = subjectPool.filter(({faculty, subject}) => {
          const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
          const notUsedToday = !dayUsage.has(subject.name);
          const notContinuous = !isSubjectContinuous(slot, subject.name);
          
          return isFacultyFree && notUsedToday && notContinuous;
        });
        
        if (candidates.length === 0) {
          // Priority 2: Faculty free, avoid continuous
          candidates = subjectPool.filter(({faculty, subject}) => {
            const isFacultyFree = !facultySchedule.get(faculty.id)?.has(slotKey);
            const notContinuous = !isSubjectContinuous(slot, subject.name);
            
            return isFacultyFree && notContinuous;
          });
        }
        
        if (candidates.length === 0) {
          // Priority 3: Just faculty free
          candidates = subjectPool.filter(({faculty}) => {
            return !facultySchedule.get(faculty.id)?.has(slotKey);
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
        // Allocate the subject
        facultySchedule.get(selected.faculty.id)?.add(slotKey);
        dayUsage.add(selected.subject.name);
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