-- Seed transport challenges
INSERT INTO daily_challenges (category, title, description, icon, xp_reward)
VALUES 
('transport', 'Walk or Cycle Short Trips', 'Leave the car keys behind for trips under 2km.', '🚶', 50),
('transport', 'Transit Commute Route', 'Choose a bus or train line for today''s commute.', '🚍', 50),
('transport', 'Consolidate Travel Errands', 'Bundle multiple travel runs into a single optimized path.', '📦', 50),
('transport', 'Maintain Eco Highway Speeds', 'Drive at continuous speeds to optimize mileage.', '🚗', 50)
ON CONFLICT DO NOTHING;

-- Seed diet challenges
INSERT INTO daily_challenges (category, title, description, icon, xp_reward)
VALUES 
('diet', 'Plant-Based Dinners', 'Cook a protein-rich plant dinner (beans, tofu, or grains).', '🥗', 50),
('diet', 'Sustain Local Farm Stands', 'Purchase regional or seasonal organic produce items.', '🍎', 50),
('diet', 'Prep Portion Leftovers', 'Organize dynamic portions to clear all kitchen waste.', '🍲', 50),
('diet', 'Reject Disposable Wrap', 'Swap plastic food wrap for wax wraps or glass boxes.', '🥤', 50)
ON CONFLICT DO NOTHING;

-- Seed energy challenges
INSERT INTO daily_challenges (category, title, description, icon, xp_reward)
VALUES 
('energy', 'Vampire Standby Shutdown', 'De-energize standby wall plugs and chargers not in active use.', '🔌', 50),
('energy', 'Thermostat Setback', 'Lower heater or raise AC parameters by 1-2 degrees Celsius.', '🌡️', 50),
('energy', 'Air Dry Wardrobes', 'Use line dry racks instead of high consumption dryers.', '🧺', 50),
('energy', 'LED Transition Check', 'Audit switches and convert remaining bulbs to high-efficiency LEDs.', '💡', 50)
ON CONFLICT DO NOTHING;
