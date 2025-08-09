const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const DatabaseService = require('./database');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
const db = new DatabaseService();

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

// Broadcast updates to all connected clients
function broadcastUpdate(type, data) {
  const message = JSON.stringify({ type, data });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// API Routes
app.get('/api/staff-status', async (req, res) => {
  try {
    const staffStatus = await db.getStaffStatus();
    res.json(staffStatus);
  } catch (error) {
    console.error('Error fetching staff status:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/visitor-count', async (req, res) => {
  try {
    const count = await db.getVisitorCount();
    res.json({ count });
  } catch (error) {
    console.error('Error fetching visitor count:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/checkin/staff', async (req, res) => {
  try {
    const { staffCode } = req.body;
    await db.checkInStaff(staffCode);
    
    // Broadcast update
    broadcastUpdate('staff_checkin', { staffCode });
    
    res.json({ success: true, message: 'Staff check-in successful' });
  } catch (error) {
    console.error('Error checking in staff:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/checkin/crt', async (req, res) => {
  try {
    const { crtCode } = req.body;
    await db.checkInCRT(crtCode);
    
    // Broadcast update
    broadcastUpdate('crt_checkin', { crtCode });
    
    res.json({ success: true, message: 'CRT check-in successful' });
  } catch (error) {
    console.error('Error checking in CRT:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/checkin/visitor', async (req, res) => {
  try {
    const { name } = req.body;
    await db.checkInVisitor(name);
    
    // Broadcast update
    broadcastUpdate('visitor_checkin', { name });
    
    res.json({ success: true, message: 'Visitor check-in successful' });
  } catch (error) {
    console.error('Error checking in visitor:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/upload/staff', async (req, res) => {
  try {
    const { staffData } = req.body;
    await db.uploadStaffData(staffData);
    
    // Broadcast update
    broadcastUpdate('staff_upload', { count: staffData.length });
    
    res.json({ success: true, message: `Successfully processed ${staffData.length} staff records` });
  } catch (error) {
    console.error('Error uploading staff data:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload/crt', async (req, res) => {
  try {
    const { crtData } = req.body;
    await db.uploadCRTData(crtData);
    
    // Broadcast update
    broadcastUpdate('crt_upload', { count: crtData.length });
    
    res.json({ success: true, message: `Successfully processed ${crtData.length} CRT records` });
  } catch (error) {
    console.error('Error uploading CRT data:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload/absence', async (req, res) => {
  try {
    const { absenceData } = req.body;
    await db.uploadAbsenceData(absenceData);
    
    // Broadcast update
    broadcastUpdate('absence_upload', { count: absenceData.length });
    
    res.json({ success: true, message: `Successfully processed ${absenceData.length} absence records` });
  } catch (error) {
    console.error('Error uploading absence data:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reset', async (req, res) => {
  try {
    await db.resetDailyAttendance();
    
    // Broadcast update
    broadcastUpdate('reset_attendance', {});
    
    res.json({ success: true, message: 'Successfully reset all attendance records for today' });
  } catch (error) {
    console.error('Error resetting attendance:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/export', async (req, res) => {
  try {
    const exportData = await db.exportAttendanceData();
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/staff/:code', async (req, res) => {
  try {
    const staff = await db.getStaffByCode(req.params.code);
    if (staff) {
      res.json(staff);
    } else {
      res.status(404).json({ error: 'Staff not found' });
    }
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    await db.initialize();
    console.log('Database initialized successfully');
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server running on ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();