-- Add paternity leave type to hr_leave_requests
ALTER TABLE hr_leave_requests DROP CONSTRAINT IF EXISTS hr_leave_requests_leave_type_check;
ALTER TABLE hr_leave_requests ADD CONSTRAINT hr_leave_requests_leave_type_check
  CHECK (leave_type IN ('annual','sick','unpaid','maternity','paternity','other'));
