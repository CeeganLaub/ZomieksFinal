-- Seed new admin user
-- Email: newadmin@zomieks.co.za
-- Password: AdminPass2026
-- Bcrypt hash verified: $2a$10$oxtmIEo39NZ.SYIjxNiMnO2GUj5ntjLd/Wk54RhUpoWBomUXu7Yha

-- Delete existing user with this email if it exists
DELETE FROM users WHERE email = 'newadmin@zomieks.co.za';

INSERT INTO users (
  id, 
  email, 
  username, 
  password_hash, 
  first_name, 
  last_name, 
  is_admin,
  is_email_verified,
  created_at, 
  updated_at
) VALUES (
  lower(hex(randomblob(16))),
  'newadmin@zomieks.co.za',
  'newadmin',
  '$2a$10$oxtmIEo39NZ.SYIjxNiMnO2GUj5ntjLd/Wk54RhUpoWBomUXu7Yha',
  'New',
  'Admin',
  1,
  1,
  datetime('now'),
  datetime('now')
);

SELECT 'New admin user created successfully!' as message;
SELECT 'Email: newadmin@zomieks.co.za' as credentials;
SELECT 'Password: AdminPass2026' as credentials;
