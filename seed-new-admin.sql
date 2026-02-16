-- Seed new admin user
-- Email: newadmin@zomieks.co.za
-- Password: AdminSecure2026
-- Bcrypt hash generated: $2a$10$MQQC2a0Dha/utF6kC/2qeewohC.duJ4qpV5dFdt1NLY80KxCTau/O

INSERT INTO users (
  id, 
  email, 
  username, 
  password_hash, 
  first_name, 
  last_name, 
  role, 
  is_verified, 
  created_at, 
  updated_at
) VALUES (
  lower(hex(randomblob(16))),
  'newadmin@zomieks.co.za',
  'newadmin',
  '$2a$10$MQQC2a0Dha/utF6kC/2qeewohC.duJ4qpV5dFdt1NLY80KxCTau/O',
  'New',
  'Admin',
  'admin',
  1,
  datetime('now'),
  datetime('now')
);

SELECT 'New admin user created successfully!' as message;
SELECT 'Email: newadmin@zomieks.co.za' as credentials;
SELECT 'Password: AdminSecure2026' as credentials;
