const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface StaffStatus {
  id: string;
  first_name: string;
  last_name: string;
  work_area: string;
  status: 'present' | 'absent' | 'non_working' | 'unaccounted';
}

export class ApiService {
  // Get staff status for today
  static async getStaffStatus(): Promise<StaffStatus[]> {
    const response = await fetch(`${API_URL}/api/staff-status`);
    if (!response.ok) {
      throw new Error(`Failed to fetch staff status: ${response.statusText}`);
    }
    return response.json();
  }

  // Check in staff member
  static async checkInStaff(staffCode: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/checkin/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ staffCode }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check in staff');
    }
  }

  // Check in CRT
  static async checkInCRT(crtCode: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/checkin/crt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ crtCode }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check in CRT');
    }
  }

  // Check in visitor
  static async checkInVisitor(name: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/checkin/visitor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check in visitor');
    }
  }

  // Get visitor count for today
  static async getVisitorCount(): Promise<number> {
    const response = await fetch(`${API_URL}/api/visitor-count`);
    if (!response.ok) {
      throw new Error(`Failed to fetch visitor count: ${response.statusText}`);
    }
    const data = await response.json();
    return data.count;
  }

  // Upload staff data
  static async uploadStaffData(staffData: any[]): Promise<void> {
    const response = await fetch(`${API_URL}/api/upload/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ staffData }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload staff data');
    }
  }

  // Upload CRT data
  static async uploadCRTData(crtData: any[]): Promise<void> {
    const response = await fetch(`${API_URL}/api/upload/crt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ crtData }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload CRT data');
    }
  }

  // Upload absence data
  static async uploadAbsenceData(absenceData: any[]): Promise<void> {
    const response = await fetch(`${API_URL}/api/upload/absence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ absenceData }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload absence data');
    }
  }

  // Reset daily attendance
  static async resetDailyAttendance(): Promise<void> {
    const response = await fetch(`${API_URL}/api/reset`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset attendance');
    }
  }

  // Export attendance data
  static async exportAttendanceData(): Promise<any[]> {
    const response = await fetch(`${API_URL}/api/export`);
    if (!response.ok) {
      throw new Error(`Failed to export data: ${response.statusText}`);
    }
    return response.json();
  }

  // Get staff by code (for absence upload validation)
  static async getStaffByCode(code: string): Promise<{ id: string } | undefined> {
    const response = await fetch(`${API_URL}/api/staff/${code}`);
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch staff: ${response.statusText}`);
    }
    return response.json();
  }
}