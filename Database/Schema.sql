-- =====================================================================
-- 🚖 NexaRide: Advanced Ride Sharing Database System
-- Schema Definition & Table Creation (BCNF Compliant)
-- Architecture: MySQL 8.0+
-- =====================================================================

CREATE DATABASE IF NOT EXISTS nexaride_db;
USE nexaride_db;

-- 1. USERS TABLE
-- Tracks riders using the platform.
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_wallet_positive CHECK (wallet_balance >= 0)
);

-- 2. DRIVERS TABLE
-- Tracks service providers. Includes a live status field.
CREATE TABLE Drivers (
    driver_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('AVAILABLE', 'ON_RIDE', 'OFFLINE') DEFAULT 'OFFLINE',
    avg_rating DECIMAL(3, 2) DEFAULT 5.00,
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_rating_range CHECK (avg_rating BETWEEN 1.00 AND 5.00)
);

-- 3. VEHICLES TABLE
-- Tracks fleets. Linked to drivers.
CREATE TABLE Vehicles (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    manufacture_year YEAR NOT NULL,
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    vehicle_type ENUM('HATCHBACK', 'SEDAN', 'SUV', 'LUXURY') NOT NULL,
    FOREIGN KEY (driver_id) REFERENCES Drivers(driver_id) ON DELETE CASCADE
);

-- 4. LOCATIONS TABLE
-- Centralized geolocation tracking for pickups and drop-offs
CREATE TABLE Locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address_text TEXT NOT NULL
);

-- 5. RIDES TABLE (Core Transactional Table)
-- Complex entity tracking lifecycle of a ride booking.
CREATE TABLE Rides (
    ride_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    driver_id INT,
    vehicle_id INT,
    pickup_loc_id INT NOT NULL,
    dropoff_loc_id INT NOT NULL,
    status ENUM('REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') DEFAULT 'REQUESTED',
    distance_km DECIMAL(6, 2),
    fare_estimated DECIMAL(8, 2),
    fare_final DECIMAL(8, 2),
    request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES Drivers(driver_id) ON DELETE SET NULL,
    FOREIGN KEY (vehicle_id) REFERENCES Vehicles(vehicle_id) ON DELETE SET NULL,
    FOREIGN KEY (pickup_loc_id) REFERENCES Locations(location_id),
    FOREIGN KEY (dropoff_loc_id) REFERENCES Locations(location_id)
);

-- 6. PAYMENTS TABLE
-- Handles the financial ledger. 1:1 mapping with Rides.
CREATE TABLE Payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL UNIQUE,
    amount DECIMAL(8, 2) NOT NULL,
    payment_method ENUM('CREDIT_CARD', 'WALLET', 'UPI', 'CASH') NOT NULL,
    payment_status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES Rides(ride_id) ON DELETE CASCADE,
    CONSTRAINT chk_amount_valid CHECK (amount > 0)
);

-- 7. RATINGS TABLE
-- Holds dual ratings (User -> Driver, Driver -> User)
CREATE TABLE Ratings (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT NOT NULL,
    rater_type ENUM('USER', 'DRIVER') NOT NULL,
    rating_score INT NOT NULL,
    review_comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES Rides(ride_id) ON DELETE CASCADE,
    CONSTRAINT chk_score_bounds CHECK (rating_score BETWEEN 1 AND 5)
);
