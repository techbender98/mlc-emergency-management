import React, { useState } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import { ApiService } from '../lib/api';
import { AlertCircle, CheckCircle2, UserCheck, Users, UserPlus, UserX, Loader2 } from 'lucide-react';

export default function PublicCheckIn() {
  const { refreshData, staffStatus, isLoading, error: contextError } = useAttendance();
  const [inputs, setInputs] = useState({
    staffCode: '',
    crtCode: '',
    visitorName: ''
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const statusCounts = {
    present: staffStatus.filter(s => s.status === 'present').length,
    absent: staffStatus.filter(s => s.status === 'absent').length,
    non_working: staffStatus.filter(s => s.status === 'non_working').length,
    unaccounted: staffStatus.filter(s => s.status === 'unaccounted').length
  };

  const handleSubmit = async (e: React.FormEvent, type: 'staff' | 'crt' | 'visitor') => {
    e.preventDefault();
    setStatus(null);

    try {
      switch (type) {
        case 'staff': {
          if (!inputs.staffCode.trim()) {
            throw new Error('Please enter a staff code');
          }

          await ApiService.checkInStaff(inputs.staffCode.trim());

          setStatus({ type: 'success', message: 'Staff check-in successful' });
          setInputs(prev => ({ ...prev, staffCode: '' }));
          break;
        }

        case 'crt': {
          if (!inputs.crtCode.trim()) {
            throw new Error('Please enter a CRT code');
          }

          await ApiService.checkInCRT(inputs.crtCode.trim());

          setStatus({ type: 'success', message: 'CRT check-in successful' });
          setInputs(prev => ({ ...prev, crtCode: '' }));
          break;
        }

        case 'visitor': {
          if (!inputs.visitorName.trim()) {
            throw new Error('Please enter a visitor name');
          }

          await ApiService.checkInVisitor(inputs.visitorName.trim());

          setStatus({ type: 'success', message: 'Visitor check-in successful' });
          setInputs(prev => ({ ...prev, visitorName: '' }));
          break;
        }
      }

      await refreshData();
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'An error occurred' 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (contextError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-red-700">
              Unable to connect to the attendance system. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Staff Status Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Staff Status Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Unaccounted', count: statusCounts.unaccounted, color: 'red', icon: Users },
            { label: 'Present', count: statusCounts.present, color: 'green', icon: Users },
            { label: 'Absent', count: statusCounts.absent, color: 'orange', icon: UserX },
            { label: 'Non-Working', count: statusCounts.non_working, color: 'orange', icon: Users }
          ].map(({ label, count, color, icon: Icon }) => (
            <div
              key={label}
              className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
              <Icon className={`w-8 h-8 text-${color}-500`} />
            </div>
          ))}
        </div>
      </div>

      {/* Check-in Forms */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid gap-6">
          {/* Staff Check-in */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Staff Check-in</h2>
            <form onSubmit={(e) => handleSubmit(e, 'staff')} className="flex gap-3">
              <input
                type="text"
                value={inputs.staffCode}
                onChange={(e) => setInputs(prev => ({ ...prev, staffCode: e.target.value.toUpperCase() }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                placeholder="Enter Staff Code"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
              >
                <UserCheck className="w-5 h-5 mr-2" />
                Check In
              </button>
            </form>
          </div>

          {/* CRT Check-in */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">CRT Check-in</h2>
            <form onSubmit={(e) => handleSubmit(e, 'crt')} className="flex gap-3">
              <input
                type="text"
                value={inputs.crtCode}
                onChange={(e) => setInputs(prev => ({ ...prev, crtCode: e.target.value.toUpperCase() }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                placeholder="Enter CRT Code"
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center"
              >
                <Users className="w-5 h-5 mr-2" />
                Check In
              </button>
            </form>
          </div>

          {/* Visitor Check-in */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Visitor Check-in</h2>
            <form onSubmit={(e) => handleSubmit(e, 'visitor')} className="flex gap-3">
              <input
                type="text"
                value={inputs.visitorName}
                onChange={(e) => setInputs(prev => ({ ...prev, visitorName: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter Visitor Name"
              />
              <button
                type="submit"
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Check In
              </button>
            </form>
          </div>
        </div>

        {status && (
          <div
            className={`mt-6 p-3 rounded-md ${
              status.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            <div className="flex items-center">
              {status.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2" />
              )}
              {status.message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}