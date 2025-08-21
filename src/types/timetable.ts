export interface Faculty {
  id: string;
  name: string;
  subjects: string[];
}

export interface TimeSlot {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  period: number;
  startTime: string;
  endTime: string;
  type: 'class' | 'break' | 'lunch';
}

export interface TimetableEntry {
  id: string;
  timeSlot: TimeSlot;
  facultyId: string;
  facultyName: string;
  subject: string;
  classRoom?: string;
}

export interface GeneratedTimetable {
  id: string;
  className: string;
  entries: TimetableEntry[];
  createdAt: Date;
  createdBy: string;
}

export interface LoginUser {
  id: string;
  name: string;
  role: 'faculty' | 'admin';
}