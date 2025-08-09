import React, { useState } from 'react';
import { useAttendance } from '../contexts/AttendanceContext';
import { Download, Upload, UserX, Users, RefreshCw, AlertCircle } from 'lucide-react';
import { ApiService } from '../lib/api';
import { format } from 'date-fns';

interface UploadStatus {
  type: 'success' | 'error';
  message: string;
  details?: string[];
}

export default function AdminDashboard() {
  const { staffStatus, refreshData } = useAttendance();
  const [selectedFiles, setSelectedFiles] = useState<{[key: string]: File | null}>({
    staff: null,
    crt: null,
    absence: null
  });
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleFileUpload = (type: 'staff' | 'crt' | 'absence') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFiles(prev => ({ ...prev, [type]: file }));
      setUploadStatus(null);
    }
  };

  const processStaffCSV = async () => {
    if (!selectedFiles.staff) return;

    try {
      const text = await selectedFiles.staff.text();
      const rows = text.split('\n')
        .map(row => row.trim())
        .filter(row => row && !row.startsWith('Code,')); // Skip header row

      const staffData = rows.map(row => {
        const [code, firstName, lastName, workArea, nonWorkingDays = ''] = row.split(',').map(cell => cell.trim());
        
        if (!code || !firstName || !lastName || !workArea) {
          return null;
        }

        return {
          code: code.toUpperCase(),
          first_name: firstName,
          last_name: lastName,
          work_area: workArea,
          non_working_days: nonWorkingDays ? nonWorkingDays.split(';').filter(day => day) : []
        };
      }).filter(data => data !== null);

      if (staffData.length === 0) {
        throw new Error('No valid staff data found in CSV');
      }

      // Upload staff data to local database
      await ApiService.uploadStaffData(staffData);

      setUploadStatus({ 
        type: 'success', 
        message: `Successfully processed ${staffData.length} staff records` 
      });
      refreshData();
      setSelectedFiles(prev => ({ ...prev, staff: null }));
      
      const fileInput = document.getElementById('staff-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to upload staff data' 
      });
    }
  };

  const processCRTCSV = async () => {
    if (!selectedFiles.crt) return;

    try {
      const text = await selectedFiles.crt.text();
      const rows = text.split('\n')
        .map(row => row.trim())
        .filter(row => row && !row.startsWith('crt_id,'));

      const errors: string[] = [];
      const crtData = rows.map((row, index) => {
        const [crtId, firstName, surname, agency] = row.split(',').map(cell => cell.trim());
        
        if (!crtId || !firstName || !surname || !agency) {
          errors.push(`Row ${index + 2}: Missing required fields`);
          return null;
        }

        return {
          code: crtId.toUpperCase(),
          first_name: firstName,
          last_name: surname,
          agency,
          date: new Date().toISOString().split('T')[0]
        };
      }).filter(data => data !== null);

      if (errors.length > 0) {
        throw new Error('Validation errors found in CRT data');
      }

      if (crtData.length === 0) {
        throw new Error('No valid CRT data found in CSV');
      }

      // Upload CRT data to local database
      await ApiService.uploadCRTData(crtData);

      setUploadStatus({ 
        type: 'success', 
        message: `Successfully processed ${crtData.length} CRT records` 
      });
      refreshData();
      setSelectedFiles(prev => ({ ...prev, crt: null }));
      
      const fileInput = document.getElementById('crt-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('CRT Upload error:', error);
      setUploadStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to upload CRT data',
        details: error instanceof Error ? [error.message] : undefined
      });
    }
  };

  const processAbsenceCSV = async () => {
    if (!selectedFiles.absence) return;

    try {
      const text = await selectedFiles.absence.text();
      const rows = text.split('\n')
        .map(row => row.trim())
        .filter(row => row && !row.startsWith('staff_id,'));

      const errors: string[] = [];
      const absenceData = await Promise.all(rows.map(async (row, index) => {
        const [staffId, staffName, sessions, absenceType] = row.split(',').map(cell => cell.trim());
        
        if (!staffId || !sessions || !absenceType) {
          errors.push(`Row ${index + 2}: Missing required fields`);
          return null;
        }

        // Validate staff ID exists in local database
        const staffExists = await ApiService.getStaffByCode(staffId);

        if (!staffExists) {
          errors.push(`Row ${index + 2}: Invalid staff ID ${staffId}`);
          return null;
        }

        return {
          staff_id: staffExists.id,
          date: new Date().toISOString().split('T')[0]
        };
      }));

      if (errors.length > 0) {
        setUploadStatus({
          type: 'error',
          message: 'Validation errors found in absence data',
          details: errors
        });
        return;
      }

      const validAbsenceData = absenceData.filter(data => data !== null);

      if (validAbsenceData.length === 0) {
        throw new Error('No valid absence data found in CSV');
      }

      // Upload absence data to local database
      await ApiService.uploadAbsenceData(validAbsenceData);

      setUploadStatus({ 
        type: 'success', 
        message: `Successfully processed ${validAbsenceData.length} absence records` 
      });
      refreshData();
      setSelectedFiles(prev => ({ ...prev, absence: null }));
      
      const fileInput = document.getElementById('absence-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Absence Upload error:', error);
      setUploadStatus({ 
        type: 'error', 
        message: 'Failed to upload absence data',
        details: error instanceof Error ? [error.message] : undefined
      });
    }
  };

  const handleReset = async () => {
    try {
      setIsResetting(true);

      // Reset daily attendance
      await ApiService.resetDailyAttendance();

      await refreshData();
      
      setUploadStatus({ type: 'success', message: 'Successfully reset all attendance records for today' });
    } catch (error) {
      console.error('Reset error:', error);
      setUploadStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to reset attendance records' 
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Export data from API
      const exportData = await ApiService.exportAttendanceData();
      
      const allRows = exportData.map(record => ({
        'Date': record.date,
        'Time In': record.time_in,
        'Time Out': record.time_out,
        'Staff Code': record.staff_code,
        'First Name': record.first_name,
        'Last Name': record.last_name,
        'Work Area': record.work_area,
        'Type': record.type
      }));

      const headers = Object.keys(allRows[0]);
      const csv = [
        headers.join(','),
        ...allRows.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setUploadStatus({ type: 'success', message: 'Successfully exported attendance records' });
    } catch (error) {
      console.error('Export error:', error);
      setUploadStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to export attendance records'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const sortedStaff = [...staffStatus].sort((a, b) => {
    const statusOrder = {
      'unaccounted': 0,
      'absent': 1,
      'non_working': 2,
      'present': 3
    };

    const statusComparison = statusOrder[a.status] - statusOrder[b.status];
    if (statusComparison !== 0) return statusComparison;

    return a.last_name.localeCompare(b.last_name);
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Staff Status Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Unaccounted', count: staffStatus.filter(s => s.status === 'unaccounted').length, color: 'red', icon: Users },
            { label: 'Present', count: staffStatus.filter(s => s.status === 'present').length, color: 'green', icon: Users },
            { label: 'Absent', count: staffStatus.filter(s => s.status === 'absent').length, color: 'orange', icon: UserX },
            { label: 'Non-Working', count: staffStatus.filter(s => s.status === 'non_working').length, color: 'orange', icon: Users }
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Staff Data Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Staff Data</h2>
          <div className="space-y-4">
            <div>
              <details className="mb-4">
                <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                  How to format your CSV file
                </summary>
                <div className="mt-3 bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                  <p className="font-semibold mb-2">CSV Format Instructions:</p>
                  <p>Required columns (in order):</p>
                  <ol className="list-decimal ml-4 mt-1 space-y-1">
                    <li>Code (unique staff code)</li>
                    <li>First Name</li>
                    <li>Last Name (Family Name)</li>
                    <li>Work Area</li>
                    <li>Non-Working Days (optional, semicolon-separated)</li>
                  </ol>
                  <p className="mt-2">Example row:</p>
                  <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
                    ADAC,Christina,ADAMS,P S PCO,Monday;Friday
                  </pre>
                </div>
              </details>
              <input
                id="staff-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload('staff')}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <button
              onClick={processStaffCSV}
              disabled={!selectedFiles.staff}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Upload className="inline-block w-5 h-5 mr-2" />
              Upload Staff Data
            </button>
          </div>
        </div>

        {/* CRT Data Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Upload CRT Data</h2>
          <div className="space-y-4">
            <div>
              <details className="mb-4">
                <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                  How to format your CSV file
                </summary>
                <div className="mt-3 bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                  <p className="font-semibold mb-2">CSV Format Instructions:</p>
                  <p>Required columns (in order):</p>
                  <ol className="list-decimal ml-4 mt-1 space-y-1">
                    <li>CRT ID</li>
                    <li>First Name</li>
                    <li>Surname</li>
                    <li>Agency</li>
                  </ol>
                  <p className="mt-2">Example row:</p>
                  <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
                    CRT001,John,SMITH,TeachWell Agency
                  </pre>
                  <p className="mt-3 text-amber-600">Note: Records are for today's date only</p>
                </div>
              </details>
              <input
                id="crt-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload('crt')}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <button
              onClick={processCRTCSV}
              disabled={!selectedFiles.crt}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Upload className="inline-block w-5 h-5 mr-2" />
              Upload CRT Data
            </button>
          </div>
        </div>

        {/* Staff Absence Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Upload Staff Absence Data</h2>
          <div className="space-y-4">
            <div>
              <details className="mb-4">
                <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                  How to format your CSV file
                </summary>
                <div className="mt-3 bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                  <p className="font-semibold mb-2">CSV Format Instructions:</p>
                  <p>Required columns (in order):</p>
                  <ol className="list-decimal ml-4 mt-1 space-y-1">
                    <li>Staff ID</li>
                    <li>Staff Name (optional)</li>
                    <li>Sessions (semicolon-separated)</li>
                    <li>Absence Type</li>
                  </ol>
                  <p className="mt-2">Example row:</p>
                  <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
                    ADAC,Christina Adams,1;2;3,Sick Leave
                  </pre>
                  <p className="mt-3 text-amber-600">Note: Records are for today's date only</p>
                </div>
              </details>
              <input
                id="absence-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload('absence')}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <button
              onClick={processAbsenceCSV}
              disabled={!selectedFiles.absence}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Upload className="inline-block w-5 h-5 mr-2" />
              Upload Absence Data
            </button>
          </div>
        </div>

        {/* Actions Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-y-4">
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <RefreshCw className={`inline-block w-5 h-5 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
              Reset Today's Attendance
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Download className={`inline-block w-5 h-5 mr-2 ${isExporting ? 'animate-spin' : ''}`} />
              Export Attendance Logs
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {uploadStatus && (
        <div className={`bg-white rounded-lg shadow-md p-6 ${
          uploadStatus.type === 'success' ? 'border-green-500' : 'border-red-500'
        } border-l-4`}>
          <div className="flex items-start">
            {uploadStatus.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
            )}
            <div>
              <h3 className={`font-semibold ${
                uploadStatus.type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {uploadStatus.message}
              </h3>
              {uploadStatus.details && uploadStatus.details.length > 0 && (
                <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                  {uploadStatus.details.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Staff List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Staff List</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Area
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedStaff.map((staff) => (
                <tr key={staff.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {staff.first_name} {staff.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {staff.work_area}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        staff.status === 'present'
                          ? 'bg-green-100 text-green-800'
                          : staff.status === 'absent'
                          ? 'bg-red-100 text-red-800'
                          : staff.status === 'non_working'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {staff.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}