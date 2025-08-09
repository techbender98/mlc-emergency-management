import React from 'react';
import { Outlet } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useAttendance } from '../contexts/AttendanceContext';

export default function Layout() {
  const { totalStaff, presentStaff, visitorCount, isLoading, error } = useAttendance();
  const allPresent = totalStaff > 0 && totalStaff === presentStaff;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Emergency Attendance System</h1>
            <div className="flex items-center space-x-4">
              {isLoading ? (
                <div className="flex items-center text-gray-500">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : error ? (
                <div className="flex items-center text-red-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  <span>Connection Error</span>
                </div>
              ) : (
                <>
                  {!allPresent && (
                    <div className="flex items-center text-amber-600">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      <span>Attendance Incomplete</span>
                    </div>
                  )}
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="text-sm text-gray-500">Present</div>
                    <div className="text-lg font-semibold">{presentStaff}/{totalStaff}</div>
                  </div>
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="text-sm text-gray-500">Visitors</div>
                    <div className="text-lg font-semibold">{visitorCount}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}