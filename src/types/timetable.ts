export interface Subject {
  name: string;
  type: 'theory' | 'lab';
  periodsPerWeek: number;
  allocation: 'continuous' | 'random';
}

export interface Faculty {
  id: string;
  name: string;
  subjects: Subject[];
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
  subjectType: 'theory' | 'lab';
  batch?: 'A' | 'B';
  classRoom?: string;
  isLabContinuation?: boolean;
}

export interface GeneratedTimetable {
  id: string;
  className: string;
  year: number;
  section: string;
  semester: number;
  entries: TimetableEntry[];
  createdAt: Date;
  createdBy: string;
}

export interface LoginUser {
  id: string;
  name: string;
  role: 'faculty' | 'admin';
}