-- Student Activity Data Analysis System - Database Schema
-- PostgreSQL Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- STUDENTS TABLE 
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 4),
    cgpa DECIMAL(4,2) CHECK (cgpa >= 0 AND cgpa <= 10),
    roll_number VARCHAR(50) UNIQUE,
    skills TEXT[],
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- LEGACY TABLES (KEPT FOR BACKWARD COMPATIBILITY)
-- ============================================================
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN (
        'Technical', 'Cultural', 'Sports', 'Social Service',
        'Research', 'Workshop', 'Seminar', 'Conference', 'Other'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    certificate_url VARCHAR(500),
    level VARCHAR(50) CHECK (level IN ('College', 'University', 'State', 'National', 'International')),
    award VARCHAR(255),
    verification_status VARCHAR(20) DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certifications (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    completion_date DATE NOT NULL,
    certificate_url VARCHAR(500),
    credential_id VARCHAR(255),
    expiry_date DATE,
    verification_status VARCHAR(20) DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS semester_results (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
    cgpa DECIMAL(4,2) CHECK (cgpa >= 0 AND cgpa <= 10),
    sgpa DECIMAL(4,2) CHECK (sgpa >= 0 AND sgpa <= 10),
    academic_year VARCHAR(20),
    backlogs INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, semester)
);

-- ============================================================
-- NEW STRICT DATA COLLECTION TABLES (7 TYPES)
-- ============================================================

-- 1. Field Projects / Student Projects
CREATE TABLE IF NOT EXISTS field_projects (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    year VARCHAR(20),
    project_name VARCHAR(255),
    program_code VARCHAR(100),
    activity VARCHAR(255),
    document_url VARCHAR(500),
    verification_status VARCHAR(20) DEFAULT 'Pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Internship Data
CREATE TABLE IF NOT EXISTS internships (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    year VARCHAR(20),
    duration VARCHAR(100),
    agency_name VARCHAR(255),
    document_url VARCHAR(500),
    -- legacy fields to not break old queries if they exist
    company VARCHAR(255),
    role VARCHAR(255),
    start_date DATE,
    end_date DATE,
    stipend DECIMAL(10,2),
    description TEXT,
    verification_status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Club Activity Data
CREATE TABLE IF NOT EXISTS club_activities (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    year VARCHAR(20),
    club_name VARCHAR(255),
    activity_name VARCHAR(255),
    duration VARCHAR(100),
    document_url VARCHAR(500),
    verification_status VARCHAR(20) DEFAULT 'Pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Sports Activity Data
CREATE TABLE IF NOT EXISTS sports_activities (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    year VARCHAR(20),
    sport_name VARCHAR(255),
    venue VARCHAR(255),
    achievement VARCHAR(255),
    document_url VARCHAR(500),
    verification_status VARCHAR(20) DEFAULT 'Pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Higher Education Data
CREATE TABLE IF NOT EXISTS higher_education (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    year_of_passing VARCHAR(20),
    program_graduated VARCHAR(255),
    institution_joined VARCHAR(255),
    program_admitted VARCHAR(255),
    verification_status VARCHAR(20) DEFAULT 'Pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Examinations Data
CREATE TABLE IF NOT EXISTS examinations (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    year VARCHAR(20),
    registration_number VARCHAR(100),
    exam_name VARCHAR(255),
    score VARCHAR(100),
    admit_card_url VARCHAR(500),
    result_document_url VARCHAR(500),
    verification_status VARCHAR(20) DEFAULT 'Pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Hackathons Data
CREATE TABLE IF NOT EXISTS hackathons (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    year VARCHAR(20),
    organization_name VARCHAR(255),
    achievement VARCHAR(255),
    project_name VARCHAR(255),
    document_url VARCHAR(500),
    verification_status VARCHAR(20) DEFAULT 'Pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Extra-Curriculars Data
CREATE TABLE IF NOT EXISTS extra_curriculars (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    year VARCHAR(20),
    activity_name VARCHAR(255),
    description TEXT,
    document_url VARCHAR(500),
    verification_status VARCHAR(20) DEFAULT 'Pending',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- MIGRATION: Add verification_status & rejection_reason to new tables
-- ============================================================
ALTER TABLE field_projects ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'Pending';
ALTER TABLE field_projects ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE field_projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE club_activities ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'Pending';
ALTER TABLE club_activities ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE club_activities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE sports_activities ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'Pending';
ALTER TABLE sports_activities ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE sports_activities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE higher_education ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'Pending';
ALTER TABLE higher_education ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE higher_education ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE examinations ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'Pending';
ALTER TABLE examinations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE examinations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'Pending';
ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE extra_curriculars ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'Pending';
ALTER TABLE extra_curriculars ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE extra_curriculars ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE internships ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
