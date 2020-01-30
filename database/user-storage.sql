CREATE TABLE user_storage
(
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  url VARCHAR(255),
  summary TEXT,
  location VARCHAR(255),
  company VARCHAR(255),
  skills mediumtext,
  tags text
)
