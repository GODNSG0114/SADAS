-- Seed Data for Student Activity Data Analysis System
-- Run AFTER schema.sql

-- ============================================================
-- SEED USERS (passwords are bcrypt hashed 'Password@123')
-- ============================================================
INSERT INTO users (name, email, password, role) VALUES
('Super Admin', 'admin@sadas.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlL/v.IeH5LGkJQJtPBqdM5ZS', 'admin'),
('Rahul Verma', 'student1@sadas.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlL/v.IeH5LGkJQJtPBqdM5ZS', 'student'),
('Sneha Patel', 'student2@sadas.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlL/v.IeH5LGkJQJtPBqdM5ZS', 'student'),
('Aarav Singh', 'student3@sadas.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlL/v.IeH5LGkJQJtPBqdM5ZS', 'student'),
('Meera Nair', 'student4@sadas.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlL/v.IeH5LGkJQJtPBqdM5ZS', 'student'),
('Karan Mehta', 'student5@sadas.edu', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlL/v.IeH5LGkJQJtPBqdM5ZS', 'student')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- SEED STUDENTS
-- ============================================================
INSERT INTO students (user_id, department, year, cgpa, roll_number, skills, phone)
SELECT id, 'Computer Science', 3, 8.5, 'CS21001', ARRAY['Python', 'React', 'Node.js'], '9876543212'
FROM users WHERE email = 'student1@sadas.edu'
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, department, year, cgpa, roll_number, skills, phone)
SELECT id, 'Electronics', 2, 7.8, 'EC22001', ARRAY['C++', 'MATLAB', 'Arduino'], '9876543213'
FROM users WHERE email = 'student2@sadas.edu'
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, department, year, cgpa, roll_number, skills, phone)
SELECT id, 'Mechanical', 4, 9.1, 'ME20001', ARRAY['AutoCAD', 'SolidWorks', 'ANSYS'], '9876543214'
FROM users WHERE email = 'student3@sadas.edu'
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, department, year, cgpa, roll_number, skills, phone)
SELECT id, 'Civil', 1, 8.0, 'CE25001', ARRAY['AutoCAD', 'Revit', 'MS Project'], '9876543215'
FROM users WHERE email = 'student4@sadas.edu'
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, department, year, cgpa, roll_number, skills, phone)
SELECT id, 'Computer Science', 3, 7.5, 'CS21002', ARRAY['Java', 'Spring Boot', 'Docker'], '9876543216'
FROM users WHERE email = 'student5@sadas.edu'
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED ACTIVITIES
-- ============================================================
INSERT INTO activities (student_id, category, title, description, date, level, award)
SELECT s.id, 'Technical', 'National Hackathon 2024', 'Developed an AI-powered waste management system', '2024-03-15', 'National', '2nd Prize'
FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@sadas.edu';

INSERT INTO activities (student_id, category, title, description, date, level, award)
SELECT s.id, 'Cultural', 'Annual Tech Fest Performance', 'Led the coding club team in technical quiz', '2024-01-20', 'College', 'Winner'
FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@sadas.edu';

-- ============================================================
-- SEED INTERNSHIPS (LEGACY FIELDS)
-- ============================================================
INSERT INTO internships (student_id, company, role, duration, start_date, end_date, description)
SELECT s.id, 'TCS', 'Software Developer Intern', '8', '2024-05-01', '2024-06-30', 'Worked on microservices architecture using Java and Spring Boot'
FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@sadas.edu';

-- ============================================================
-- SEED CERTIFICATIONS
-- ============================================================
INSERT INTO certifications (student_id, title, provider, completion_date, credential_id)
SELECT s.id, 'AWS Certified Cloud Practitioner', 'Amazon Web Services', '2024-03-20', 'AWS-CC-123456'
FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@sadas.edu';

-- ============================================================
-- SEED SEMESTER RESULTS
-- ============================================================
INSERT INTO semester_results (student_id, semester, cgpa, sgpa, academic_year)
SELECT s.id, 1, 8.2, 8.2, '2021-22'
FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@sadas.edu';

-- ============================================================
-- NEW DISTINCT DATA SEEDS
-- ============================================================

INSERT INTO field_projects (student_id, year, project_name, program_code, activity, document_url)
SELECT s.id, '2023-24', 'AI Smart Grid Simulator', 'CS-PROJ-302', 'Mini Project', 'https://example.com/project-report.pdf'
FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@sadas.edu';

INSERT INTO internships (student_id, year, duration, agency_name, document_url)
SELECT s.id, '2023-24', '3 months', 'Google Analytics', 'https://example.com/intern-cert-new.pdf'
FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@sadas.edu';

INSERT INTO club_activities (student_id, year, club_name, activity_name, duration, document_url)
SELECT s.id, '2023-24', 'AI & Robotics Club', 'RoboWars 2024 Coord', '1 month', 'https://example.com/club-cert.pdf'
FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@sadas.edu';

INSERT INTO sports_activities (student_id, year, sport_name, venue, achievement, document_url)
SELECT s.id, '2023-24', 'Basketball', 'Outside College - DBIT Indoor', 'Winner', 'https://example.com/sports-medal.pdf'
FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@sadas.edu';

INSERT INTO higher_education (student_id, year_of_passing, program_graduated, institution_joined, program_admitted)
SELECT s.id, '2024', 'B.E Computer Science', 'Stanford University', 'M.S Computer Science'
FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@sadas.edu';

INSERT INTO examinations (student_id, year, registration_number, exam_name, score, admit_card_url, result_document_url)
SELECT s.id, '2023', 'GATE-CS-987654', 'GATE', 'Score: 680', 'https://example.com/admit.pdf', 'https://example.com/score.pdf'
FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@sadas.edu';

INSERT INTO hackathons (student_id, year, organization_name, achievement, project_name, document_url)
SELECT s.id, '2023-24', 'Smart India Hackathon', '1st Runner Up', 'Eco-Scan', 'https://example.com/sih-cert.pdf'
FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@sadas.edu';

INSERT INTO extra_curriculars (student_id, year, activity_name, description, document_url)
SELECT s.id, '2023-24', 'Debate Competition', 'Inter-collegiate debate competition on AI Ethics', 'https://example.com/debate.pdf'
FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@sadas.edu';
