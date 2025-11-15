# Human Resources System Documentation

## Overview

This HR management system handles employee records, department organization, attendance tracking, and leave management.

## Business Rules

### Department Management
- Each department has a unique name
- Departments can have a manager (who must be an employee)
- Departments can have a physical location

### Employee Management
- Each employee must have a unique email address
- Employees are assigned to departments
- Employees can have managers (reporting structure)
- Employee status can be: `active`, `on_leave`, `terminated`
- Salary information is confidential and optional

### Attendance Tracking
- Attendance is recorded daily for each employee
- Each employee can have only one attendance record per day
- Attendance status can be: `present`, `absent`, `late`, `half_day`
- Check-in and check-out times are recorded

### Leave Management
- Leave requests must be submitted before the leave period
- Leave types include: `vacation`, `sick`, `personal`, `unpaid`
- Leave requests go through approval workflow:
  - `pending`: Awaiting manager approval
  - `approved`: Approved by manager
  - `rejected`: Rejected by manager
  - `cancelled`: Cancelled by employee

## Common Queries

### Get department employees
```sql
SELECT e.employee_id, e.first_name, e.last_name, e.job_title, e.hire_date
FROM employees e
WHERE e.department_id = ? AND e.status = 'active'
ORDER BY e.last_name, e.first_name;
```

### Get employee attendance for a month
```sql
SELECT date, check_in_time, check_out_time, status
FROM attendance
WHERE employee_id = ? 
  AND date >= DATE_TRUNC('month', CURRENT_DATE)
  AND date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
ORDER BY date;
```

### Get pending leave requests for manager
```sql
SELECT lr.leave_id, e.first_name, e.last_name, 
       lr.leave_type, lr.start_date, lr.end_date, lr.reason
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.employee_id
WHERE e.manager_id = ? AND lr.status = 'pending'
ORDER BY lr.created_at;
```

## Reporting Structure

### Organizational Hierarchy
- Employees can have managers (manager_id references employees)
- Department managers are tracked separately in departments table
- This allows for matrix organization structures

### Performance Reviews
- Conducted quarterly or annually
- Manager reviews direct reports
- HR maintains review records

## Compliance

### Data Privacy
- Salary information is restricted to HR and management
- Personal contact information is protected
- Attendance records are confidential

### Labor Laws
- Leave balances must comply with local regulations
- Overtime tracking may be required
- Termination records must be maintained
