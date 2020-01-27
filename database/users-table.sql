DROP TABLE IF EXISTS users;
CREATE TABLE users
(
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(12),
  password VARCHAR(8)
);
