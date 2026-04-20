-- 009_property_enhancements.sql
-- Adds total_units and tour_booking_url to properties for occupancy tracking
-- and self-service tour scheduling.

alter table properties
  add column if not exists total_units    integer,
  add column if not exists tour_booking_url text;
