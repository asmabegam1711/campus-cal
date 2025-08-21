import { Faculty, TimeSlot, TimetableEntry, GeneratedTimetable } from '@/types/timetable';

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
  createdBy: string
): GeneratedTimetable => {
  const timeSlots = generateTimeSlots().filter(slot => slot.type === 'class');
  const entries: TimetableEntry[] = [];
  const facultySchedule: Map<string, Set<string>> = new Map();

  // Initialize faculty schedule tracking
  faculties.forEach(faculty => {
    facultySchedule.set(faculty.id, new Set());
  });

  // Shuffle faculties and subjects for random distribution
  const shuffledFaculties = [...faculties].sort(() => Math.random() - 0.5);

  timeSlots.forEach(slot => {
    const slotKey = `${slot.day}-${slot.period}`;
    
    // Find available faculty for this slot
    const availableFaculties = shuffledFaculties.filter(faculty => 
      !facultySchedule.get(faculty.id)?.has(slotKey)
    );
    
    if (availableFaculties.length > 0) {
      const selectedFaculty = availableFaculties[0];
      const randomSubject = selectedFaculty.subjects[
        Math.floor(Math.random() * selectedFaculty.subjects.length)
      ];
      
      // Add to faculty schedule
      facultySchedule.get(selectedFaculty.id)?.add(slotKey);
      
      entries.push({
        id: `${slot.day}-${slot.period}-${selectedFaculty.id}`,
        timeSlot: slot,
        facultyId: selectedFaculty.id,
        facultyName: selectedFaculty.name,
        subject: randomSubject,
        classRoom: `Room ${Math.floor(Math.random() * 20) + 101}`
      });
    }
  });

  return {
    id: Date.now().toString(),
    className,
    entries,
    createdAt: new Date(),
    createdBy
  };
};