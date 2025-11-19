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

  // Check if faculty is available for a specific slot
  isFacultyAvailable(facultyId: string, day: string, period: number): boolean {
    // Always refresh from storage to ensure we have the latest assignments
    this.loadFromStorage();

    const schedules = this.globalSchedule.get(facultyId) || [];
    return !schedules.some(schedule => 
      schedule.day === day && schedule.period === period
    );
  }

  // Add faculty assignment to global schedule
  addFacultyAssignment(
    facultyId: string, 
    day: string, 
    period: number, 
    className: string,
    year: number,
    section: string,
    semester: number
  ): boolean {
    // Ensure we are working against the latest state
    this.loadFromStorage();

    if (!this.isFacultyAvailable(facultyId, day, period)) {
      console.warn(`Faculty ${facultyId} already assigned at ${day} Period ${period}`);
      return false; // Faculty is already assigned at this time
    }

    const schedules = this.globalSchedule.get(facultyId) || [];
    schedules.push({
      facultyId,
      day,
      period,
      classInfo: `${className}-${year}-${section}-${semester}`
    });
    
    this.globalSchedule.set(facultyId, schedules);
    this.saveToStorage();
    return true;
  }

  // Remove all assignments for a specific class (when deleting timetable)
  removeClassAssignments(className: string, year: number, section: string, semester: number) {
    const classInfo = `${className}-${year}-${section}-${semester}`;
    
    this.globalSchedule.forEach((schedules, facultyId) => {
      const filteredSchedules = schedules.filter(schedule => 
        schedule.classInfo !== classInfo
      );
      this.globalSchedule.set(facultyId, filteredSchedules);
    });
    
    this.saveToStorage();
  }

  // Get faculty's current assignments
  getFacultySchedule(facultyId: string): GlobalFacultySchedule[] {
    return this.globalSchedule.get(facultyId) || [];
  }

  // Load schedule from localStorage
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.globalSchedule = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load global schedule from storage:', error);
    }
  }

  // Save schedule to localStorage
  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.globalSchedule);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save global schedule to storage:', error);
    }
  }

  // Clear all schedules (for testing or reset)
  clearAll() {
    this.globalSchedule.clear();
    this.saveToStorage();
  }

  // Get all faculty schedules (for debugging or display)
  getAllSchedules(): Map<string, GlobalFacultySchedule[]> {
    return new Map(this.globalSchedule);
  }
}

export default GlobalScheduleManager;