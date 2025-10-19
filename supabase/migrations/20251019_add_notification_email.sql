-- Add notification_email field to congregations table
ALTER TABLE congregations ADD COLUMN notification_email TEXT;

-- Comment on the column
COMMENT ON COLUMN congregations.notification_email IS 'Default email to notify if no one closes their map after 24 hours';
