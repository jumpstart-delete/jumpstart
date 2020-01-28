DROP TABLE IF EXISTS users;
CREATE TABLE users
(
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(12),
  password VARCHAR(255)
);

INSERT into users (username, password) VALUES ('tester', crypt('starbucks', gen_salt('bf', 8)));
