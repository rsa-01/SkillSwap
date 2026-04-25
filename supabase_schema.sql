-- Execute this in the Supabase SQL Editor

-- 1. Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    bio TEXT
);

-- 2. Create Skills Table
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    offer TEXT NOT NULL,
    request TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Exchange Requests Table
CREATE TABLE exchange_requests (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    from_user_name TEXT NOT NULL,
    target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    target_user_name TEXT NOT NULL,
    target_skill_offer TEXT NOT NULL,
    offered_skill TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Messages Table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    exchange_id INTEGER REFERENCES exchange_requests(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Insert dummy data
INSERT INTO users (name, email, password, bio) VALUES 
('Alice', 'alice@example.com', 'password', 'I love learning new things!'),
('Bob', 'bob@example.com', 'password', 'Software engineer and language enthusiast.'),
('Charlie', 'charlie@example.com', 'password', 'Artist and designer.');

INSERT INTO skills (user_id, user_name, offer, request, category) VALUES 
(1, 'Alice', 'JavaScript Mentoring', 'Guitar Lessons', 'Technology'),
(2, 'Bob', 'French Tutoring', 'Web Design', 'Languages'),
(3, 'Charlie', 'Digital Art', 'Python Basics', 'Arts');
