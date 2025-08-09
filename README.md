# Emergency Attendance System

A real-time attendance tracking system with MySQL backend and WebSocket updates.

## Prerequisites

- Node.js (v16 or higher)
- MySQL Server
- npm or yarn

## Setup Instructions

### 1. Install MySQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

**CentOS/RHEL:**
```bash
sudo yum install mysql-server
sudo systemctl start mysqld
sudo mysql_secure_installation
```

### 2. Create MySQL User (Optional)

```sql
CREATE USER 'attendance_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON attendance_system.* TO 'attendance_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment

Copy the example environment file and update it:

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=attendance_system
PORT=3001
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### 5. Start the Application

**Development mode (both frontend and backend):**
```bash
npm run dev:full
```

**Or start separately:**

Backend only:
```bash
npm run server
```

Frontend only:
```bash
npm run dev
```

## Features

- **Real-time Updates**: WebSocket connections provide instant updates across all connected clients
- **Staff Management**: Upload staff data via CSV, track attendance status
- **CRT Support**: Manage Casual Relief Teacher codes and check-ins
- **Visitor Tracking**: Register and track visitor attendance
- **Absence Management**: Upload and track staff absences
- **Data Export**: Export attendance data to CSV format
- **MySQL Backend**: Reliable server-side database with proper relationships

## API Endpoints

- `GET /api/staff-status` - Get current staff status
- `GET /api/visitor-count` - Get today's visitor count
- `POST /api/checkin/staff` - Check in staff member
- `POST /api/checkin/crt` - Check in CRT
- `POST /api/checkin/visitor` - Check in visitor
- `POST /api/upload/staff` - Upload staff data
- `POST /api/upload/crt` - Upload CRT data
- `POST /api/upload/absence` - Upload absence data
- `POST /api/reset` - Reset today's attendance
- `GET /api/export` - Export attendance data

## WebSocket Events

The system broadcasts real-time updates for:
- Staff check-ins
- CRT check-ins
- Visitor check-ins
- Data uploads
- Attendance resets

## Database Schema

The system automatically creates the following tables:
- `staff` - Staff member information
- `attendance_logs` - Daily attendance records
- `visitors` - Visitor check-in records
- `crt_codes` - CRT codes for each day
- `daily_absences` - Staff absence records

## Troubleshooting

### MySQL Connection Issues

1. Ensure MySQL is running:
   ```bash
   sudo systemctl status mysql
   ```

2. Check MySQL credentials in `.env` file

3. Verify database permissions

### Port Conflicts

If port 3001 is in use, update the `PORT` in `.env` and `VITE_API_URL`/`VITE_WS_URL` accordingly.

### WebSocket Connection Issues

Ensure both frontend and backend are running and the WebSocket URL in `.env` is correct.