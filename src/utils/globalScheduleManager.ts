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

  private constructor() {}

  static getInstance(): GlobalScheduleManager {
    if (!GlobalScheduleManager.instance) {
      GlobalScheduleManager.instance = new GlobalScheduleManager();
    }
    return GlobalScheduleManager.instance;
  }

  // Check if faculty is available for a specific slot
  isFacultyAvailable(facultyId: string, day: string, period: number): boolean {
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
    if (!this.isFacultyAvailable(facultyId, day, period)) {
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
  }

  // Get faculty's current assignments
  getFacultySchedule(facultyId: string): GlobalFacultySchedule[] {
    return this.globalSchedule.get(facultyId) || [];
  }

  // Clear all schedules (for testing or reset)
  clearAll() {
    this.globalSchedule.clear();
  }
}

export default GlobalScheduleManager;