-- Human Resources Database Schema
-- Version: 1.0.0

-- Departments table
CREATE TABLE departments (
  department_id SERIAL PRIMARY KEY,
  department_name VARCHAR(100) UNIQUE NOT NULL,
  location VARCHAR(100),
  manager_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE employees (
  employee_id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  hire_date DATE NOT NULL,
  job_title VARCHAR(100) NOT NULL,
  department_id INTEGER REFERENCES departments(department_id),
  salary DECIMAL(10, 2),
  manager_id INTEGER REFERENCES employees(employee_id),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for department manager
ALTER TABLE departments 
  ADD CONSTRAINT fk_department_manager 
  FOREIGN KEY (manager_id) REFERENCES employees(employee_id);

-- Attendance table
CREATE TABLE attendance (
  attendance_id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(employee_id),
  date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  status VARCHAR(20) DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, date)
);

-- Leave requests table
CREATE TABLE leave_requests (
  leave_id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(employee_id),
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by INTEGER REFERENCES employees(employee_id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_attendance_employee ON attendance(employee_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
