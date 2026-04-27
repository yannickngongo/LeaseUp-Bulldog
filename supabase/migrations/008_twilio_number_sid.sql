-- Store the Twilio IncomingPhoneNumber SID alongside the number so we can
-- release it (stop billing) when a property is deleted.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS twilio_number_sid TEXT;
