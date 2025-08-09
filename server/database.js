const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

class DatabaseService {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    // Create connection pool
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'attendance_system',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000
    });

    // Create database if it doesn't exist
    await this.createDatabase();
    await this.createTables();
  }

  async createDatabase() {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    try {
      await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'attendance_system'}`);
      console.log('Database created or already exists');
    } catch (error) {
      console.error('Error creating database:', error);
    } finally {
      await connection.end();
    }
  }

  async createTables() {
    const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS staff (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        work_area VARCHAR(255) NOT NULL,
        non_working_days JSON DEFAULT ('[]'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_staff_code (code)
      );

      CREATE TABLE IF NOT EXISTS attendance_logs (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        staff_id VARCHAR(36),
        check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        check_out_time TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id),
        INDEX idx_attendance_logs_check_in (check_in_time)
      );

      CREATE TABLE IF NOT EXISTS visitors (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        check_out_time TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS crt_codes (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        code VARCHAR(50) NOT NULL,
        date DATE DEFAULT (CURDATE()),
        assigned_to VARCHAR(36) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_code_date (code, date),
        FOREIGN KEY (assigned_to) REFERENCES staff(id),
        INDEX idx_crt_codes_date (date)
      );

      CREATE TABLE IF NOT EXISTS daily_absences (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        staff_id VARCHAR(36),
        date DATE DEFAULT (CURDATE()),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_staff_date (staff_id, date),
        FOREIGN KEY (staff_id) REFERENCES staff(id),
        INDEX idx_daily_absences_date (date)
      );
    `;

    const statements = createTablesSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await this.pool.execute(statement);
        } catch (error) {
          console.error('Error creating table:', error);
        }
      }
    }
    
    console.log('Tables created successfully');
  }

  async getStaffStatus() {
    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const query = `
      SELECT 
        s.id,
        s.first_name,
        s.last_name,
        s.work_area,
        CASE 
          WHEN al.staff_id IS NOT NULL THEN 'present'
          WHEN da.staff_id IS NOT NULL THEN 'absent'
          WHEN JSON_CONTAINS(s.non_working_days, JSON_QUOTE(?)) THEN 'non_working'
          ELSE 'unaccounted'
        END as status
      FROM staff s
      LEFT JOIN (
        SELECT DISTINCT staff_id 
        FROM attendance_logs 
        WHERE DATE(check_in_time) = ?
      ) al ON s.id = al.staff_id
      LEFT JOIN daily_absences da ON s.id = da.staff_id AND da.date = ?
      ORDER BY s.last_name, s.first_name
    `;

    const [rows] = await this.pool.execute(query, [dayOfWeek, today, today]);
    return rows;
  }

  async checkInStaff(staffCode) {
    const [staff] = await this.pool.execute(
      'SELECT id FROM staff WHERE code = ?',
      [staffCode.toUpperCase()]
    );

    if (staff.length === 0) {
      throw new Error('Invalid staff code');
    }

    await this.pool.execute(
      'INSERT INTO attendance_logs (staff_id) VALUES (?)',
      [staff[0].id]
    );
  }

  async checkInCRT(crtCode) {
    const today = new Date().toISOString().split('T')[0];
    
    const [crt] = await this.pool.execute(
      'SELECT id FROM crt_codes WHERE code = ? AND date = ?',
      [crtCode.toUpperCase(), today]
    );

    if (crt.length === 0) {
      throw new Error('Invalid CRT code for today');
    }
  }

  async checkInVisitor(name) {
    await this.pool.execute(
      'INSERT INTO visitors (name) VALUES (?)',
      [name.trim()]
    );
  }

  async getVisitorCount() {
    const today = new Date().toISOString().split('T')[0];
    
    const [rows] = await this.pool.execute(
      'SELECT COUNT(*) as count FROM visitors WHERE DATE(check_in_time) = ?',
      [today]
    );
    
    return rows[0].count;
  }

  async uploadStaffData(staffData) {
    await this.pool.execute('DELETE FROM staff');
    
    for (const staff of staffData) {
      await this.pool.execute(
        'INSERT INTO staff (code, first_name, last_name, work_area, non_working_days) VALUES (?, ?, ?, ?, ?)',
        [
          staff.code,
          staff.first_name,
          staff.last_name,
          staff.work_area,
          JSON.stringify(staff.non_working_days || [])
        ]
      );
    }
  }

  async uploadCRTData(crtData) {
    for (const crt of crtData) {
      await this.pool.execute(
        'INSERT INTO crt_codes (code, date) VALUES (?, ?) ON DUPLICATE KEY UPDATE code = VALUES(code)',
        [crt.code, crt.date]
      );
    }
  }

  async uploadAbsenceData(absenceData) {
    for (const absence of absenceData) {
      await this.pool.execute(
        'INSERT INTO daily_absences (staff_id, date) VALUES (?, ?) ON DUPLICATE KEY UPDATE staff_id = VALUES(staff_id)',
        [absence.staff_id, absence.date]
      );
    }
  }

  async resetDailyAttendance() {
    const today = new Date().toISOString().split('T')[0];
    
    await this.pool.execute('DELETE FROM attendance_logs WHERE DATE(check_in_time) = ?', [today]);
    await this.pool.execute('DELETE FROM visitors WHERE DATE(check_in_time) = ?', [today]);
    await this.pool.execute('DELETE FROM daily_absences WHERE date = ?', [today]);
  }

  async exportAttendanceData() {
    const today = new Date().toISOString().split('T')[0];
    
    const attendanceQuery = `
      SELECT 
        DATE(al.check_in_time) as date,
        TIME(al.check_in_time) as time_in,
        COALESCE(TIME(al.check_out_time), '') as time_out,
        s.code as staff_code,
        s.first_name,
        s.last_name,
        s.work_area,
        'Staff' as type
      FROM attendance_logs al
      JOIN staff s ON al.staff_id = s.id
      WHERE DATE(al.check_in_time) = ?
    `;

    const visitorQuery = `
      SELECT 
        DATE(check_in_time) as date,
        TIME(check_in_time) as time_in,
        COALESCE(TIME(check_out_time), '') as time_out,
        '' as staff_code,
        name as first_name,
        '' as last_name,
        '' as work_area,
        'Visitor' as type
      FROM visitors
      WHERE DATE(check_in_time) = ?
    `;

    const [attendanceData] = await this.pool.execute(attendanceQuery, [today]);
    const [visitorData] = await this.pool.execute(visitorQuery, [today]);

    return [...attendanceData, ...visitorData];
  }

  async getStaffByCode(code) {
    const [rows] = await this.pool.execute(
      'SELECT id FROM staff WHERE code = ?',
      [code.toUpperCase()]
    );
    
    return rows.length > 0 ? rows[0] : undefined;
  }
}

module.exports = DatabaseService;