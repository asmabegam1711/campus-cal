// Global faculty schedule manager to prevent clashes across different classes
export interface GlobalFacultySchedule {
  facultyId: string;
  day: string;
  period: number;
  classInfo: string; // "ClassName-Year-Section-Semester"
}

class GlobalScheduleManager {
  private static instance: GlobalScheduleManager;
  private globalSchedule: Map<string, GlobalFacultySchedule[]> = new Map();
  private readonly STORAGE_KEY = 'faculty_global_schedule';

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): GlobalScheduleManager {
    if (!GlobalScheduleManager.instance) {
      GlobalScheduleManager.instance = new GlobalScheduleManager();
    }
    return GlobalScheduleManager.instance;
  }

  // FIXED: Correctly check faculty availability
  isFacultyAvailable(facultyId: string, day: string, period: number): boolean {
    // Always reload to ensure we have the latest data
    this.loadFromStorage();

    const schedules = this.globalSchedule.get(facultyId) || [];
    const isOccupied = schedules.some(s => s.day === day && s.period === period);
    
    if (isOccupied) {
      const conflictingSchedule = schedules.find(s => s.day === day && s.period === period);
      console.log(`[AVAILABILITY CHECK] Faculty ${facultyId} is OCCUPIED on ${day} period ${period} by ${conflictingSchedule?.classInfo}`);
    }
    
    return !isOccupied;
  }

  // FIXED: Add assignment only when available
  addFacultyAssignment(
    facultyId: string, 
    day: string, 
    period: number, 
    className: string,
    year: number,
    section: string,
    semester: number
  ): boolean {
    // Always reload to ensure we have the latest data before adding
    this.loadFromStorage();

    if (!this.isFacultyAvailable(facultyId, day, period)) {
      console.warn(`[ADD ASSIGNMENT FAILED] Faculty ${facultyId} conflict at ${day} Period ${period}`);
      return false;
    }

    const schedules = this.globalSchedule.get(facultyId) || [];
    const classInfo = `${className}-${year}-${section}-${semester}`;
    
    schedules.push({
      facultyId,
      day,
      period,
      classInfo
    });

    this.globalSchedule.set(facultyId, schedules);
    this.saveToStorage();
    
    console.log(`[ADD ASSIGNMENT SUCCESS] Faculty ${facultyId} assigned to ${day} Period ${period} for ${classInfo}`);
    return true;
  }

  // Remove assignments for a deleted timetable
  removeClassAssignments(className: string, year: number, section: string, semester: number) {
    const classInfo = `${className}-${year}-${section}-${semester}`;

    this.globalSchedule.forEach((schedules, facultyId) => {
      const filtered = schedules.filter(s => s.classInfo !== classInfo);
      this.globalSchedule.set(facultyId, filtered);
    });

    this.saveToStorage();
  }

  getFacultySchedule(facultyId: string): GlobalFacultySchedule[] {
    return this.globalSchedule.get(facultyId) || [];
  }

  // FIXED STORAGE CONVERSION (MOST IMPORTANT FIX)
  public loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const obj = JSON.parse(stored);

        // Convert plain object back to Map
        this.globalSchedule = new Map(
          Object.entries(obj).map(([facultyId, schedules]) => [
            facultyId,
            schedules as GlobalFacultySchedule[]
          ])
        );
      }
    } catch (error) {
      console.error('Failed to load global schedule:', error);
    }
  }

  // FIXED: Save Map correctly
  private saveToStorage() {
    try {
      const obj = Object.fromEntries(this.globalSchedule);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
      console.error('Failed to save global schedule:', error);
    }
  }

  // DO NOT CALL THIS during timetable generation
  clearAll() {
    this.globalSchedule.clear();
    this.saveToStorage();
  }

  getAllSchedules(): Map<string, GlobalFacultySchedule[]> {
    return new Map(this.globalSchedule);
  }
}

export default GlobalScheduleManager;
