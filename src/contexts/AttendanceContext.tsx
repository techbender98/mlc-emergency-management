import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiService, StaffStatus } from '../lib/api';
import { wsService, WebSocketMessage } from '../lib/websocket';

interface AttendanceContextType {
  staffStatus: StaffStatus[];
  visitorCount: number;
  totalStaff: number;
  presentStaff: number;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  const [staffStatus, setStaffStatus] = useState<StaffStatus[]>([]);
  const [visitorCount, setVisitorCount] = useState(0);
  const [totalStaff, setTotalStaff] = useState(0);
  const [presentStaff, setPresentStaff] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get staff status from API
      const statusData = await ApiService.getStaffStatus();
      
      setStaffStatus(statusData);
      setTotalStaff(statusData.length);
      setPresentStaff(statusData.filter(s => s.status === 'present').length);

      // Get visitor count from API
      const visitorCount = await ApiService.getVisitorCount();
      setVisitorCount(visitorCount);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      // Set default values when there's an error
      setStaffStatus([]);
      setTotalStaff(0);
      setPresentStaff(0);
      setVisitorCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle WebSocket messages for real-time updates
  const handleWebSocketMessage = (message: WebSocketMessage) => {
    console.log('Received WebSocket message:', message);
    // Refresh data when any update occurs
    refreshData().catch(console.error);
  };

  useEffect(() => {
    // Connect to WebSocket
    wsService.connect();
    wsService.addListener(handleWebSocketMessage);

    // Initial data load
    refreshData();

    // Cleanup on unmount
    return () => {
      wsService.removeListener(handleWebSocketMessage);
      wsService.disconnect();
    };
  }, []);

  // Periodic refresh as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData().catch(console.error);
    }, 30000); // Refresh every 30 seconds as fallback

    return () => clearInterval(interval);
  }, []);
  return (
    <AttendanceContext.Provider value={{
      staffStatus,
      visitorCount,
      totalStaff,
      presentStaff,
      isLoading,
      error,
      refreshData,
    }}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
}