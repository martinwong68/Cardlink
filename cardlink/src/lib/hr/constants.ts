/** Shared HR constants used by frontend and API routes */

export const LEAVE_TYPES = ["annual", "sick", "unpaid", "maternity", "paternity", "other"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYEE_STATUSES = ["active", "inactive", "terminated"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const ATTENDANCE_STATUSES = ["present", "absent", "late", "half_day"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const PAYROLL_STATUSES = ["draft", "approved", "paid"] as const;
export type PayrollStatus = (typeof PAYROLL_STATUSES)[number];

export const DOC_TYPES = ["contract", "id_document", "certificate", "payslip", "other"] as const;
export type DocType = (typeof DOC_TYPES)[number];
