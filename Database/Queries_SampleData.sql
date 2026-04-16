-- =====================================================================
-- 🚖 NexaRide: Sample Data Injection & Advanced Queries
-- =====================================================================

USE nexaride_db;

-- ---------------------------------------------------------------------
-- 📂 1. SAMPLE DATA INSERTION (Min 5 rows per table)
-- ---------------------------------------------------------------------

-- Insert Users (Pune Residents)
INSERT INTO Users (first_name, last_name, email, phone_number, wallet_balance) VALUES
('Amit', 'Deshmukh', 'amit.deshmukh@email.com', '+91-98501-01001', 1500.00),
('Sneha', 'Kulkarni', 'sneha.k@email.com', '+91-98501-01002', 200.50),
('Priya', 'Sharma', 'priya.sharma@email.com', '+91-98501-01003', 5000.00),
('Rohan', 'Mehta', 'rohan.m@email.com', '+91-98501-01004', 0.00),
('Kavita', 'Pawar', 'kavita.p@email.com', '+91-98501-01005', 850.00);

-- Insert Drivers (Pune-based)
INSERT INTO Drivers (first_name, last_name, email, phone_number, license_number, status, avg_rating) VALUES
('Raj', 'Patil', 'raj.patil@drive.com', '+91-98502-02001', 'MH-12-AB-1234', 'AVAILABLE', 4.9),
('Vikram', 'Joshi', 'vikram.j@drive.com', '+91-98502-02002', 'MH-12-CD-5678', 'AVAILABLE', 4.8),
('Anil', 'More', 'anil.more@drive.com', '+91-98502-02003', 'MH-14-EF-9012', 'AVAILABLE', 4.7),
('Suresh', 'Gaikwad', 'suresh.g@drive.com', '+91-98502-02004', 'MH-12-GH-3456', 'ON_RIDE', 4.5),
('Deepak', 'Shinde', 'deepak.s@drive.com', '+91-98502-02005', 'MH-14-IJ-7890', 'OFFLINE', 3.8);

-- Insert Vehicles (Indian Market Vehicles)
INSERT INTO Vehicles (driver_id, make, model, manufacture_year, license_plate, vehicle_type) VALUES
(1, 'Maruti', 'Ciaz', 2023, 'MH-12-AB-1234', 'SEDAN'),
(2, 'Toyota', 'Innova Crysta', 2022, 'MH-12-CD-5678', 'SUV'),
(3, 'Honda', 'City', 2024, 'MH-14-EF-9012', 'SEDAN'),
(4, 'Mercedes', 'E-Class', 2023, 'MH-12-GH-3456', 'LUXURY'),
(5, 'Hyundai', 'i20', 2021, 'MH-14-IJ-7890', 'HATCHBACK');

-- Insert Locations (Pune Landmarks)
INSERT INTO Locations (latitude, longitude, address_text) VALUES
(18.5308, 73.8475, 'Shivajinagar, Pune'),
(18.5912, 73.7381, 'Hinjewadi IT Park, Pune'),
(18.5362, 73.8939, 'Koregaon Park, Pune'),
(18.5168, 73.8413, 'Deccan Gymkhana, Pune'),
(18.5018, 73.8636, 'Swargate Bus Stand, Pune');

-- Insert Rides (Pune Routes, INR Fares)
INSERT INTO Rides (user_id, driver_id, vehicle_id, pickup_loc_id, dropoff_loc_id, status, distance_km, fare_final, request_time, start_time, end_time) VALUES
(1, 1, 1, 1, 2, 'COMPLETED', 14.5, 540.00, '2024-04-10 08:00:00', '2024-04-10 08:05:00', '2024-04-10 08:45:00'),
(2, 2, 2, 3, 4, 'COMPLETED', 6.8, 280.00, '2024-04-11 14:00:00', '2024-04-11 14:03:00', '2024-04-11 14:20:00'),
(3, 3, 3, 5, 1, 'COMPLETED', 10.2, 420.00, '2024-04-12 18:30:00', '2024-04-12 18:35:00', '2024-04-12 19:25:00'),
(4, 4, 4, 4, 3, 'IN_PROGRESS', 8.4, 350.00, '2024-04-14 09:15:00', '2024-04-14 09:20:00', NULL),
(5, 5, 5, 4, 5, 'CANCELLED', NULL, NULL, '2024-04-14 10:00:00', NULL, NULL);

-- Insert Payments (INR)
INSERT INTO Payments (ride_id, amount, payment_method, payment_status) VALUES
(1, 540.00, 'UPI', 'SUCCESS'),
(2, 280.00, 'WALLET', 'SUCCESS'),
(3, 420.00, 'UPI', 'SUCCESS');
-- Ride 4 is in-progress, Ride 5 is cancelled.

-- Insert Ratings
INSERT INTO Ratings (ride_id, rater_type, rating_score, review_comments) VALUES
(1, 'USER', 5, 'Excellent ride from Shivajinagar to Hinjewadi!'),
(1, 'DRIVER', 5, 'Punctual and polite passenger.'),
(2, 'USER', 4, 'Great Toyota Innova, comfortable ride.'),
(3, 'USER', 5, 'Quick ride from Swargate to Shivajinagar!'),
(2, 'DRIVER', 4, 'Passenger was slightly delayed at pickup.');


-- ---------------------------------------------------------------------
-- 📊 2. ADVANCED SQL QUERIES (Min 8)
-- ---------------------------------------------------------------------

-- Q1. INNER JOIN: Retrieve full receipt for completed rides.
SELECT r.ride_id, u.first_name AS rider, d.first_name AS driver, v.make AS vehicle, p.amount, p.payment_status
FROM Rides r
INNER JOIN Users u ON r.user_id = u.user_id
INNER JOIN Drivers d ON r.driver_id = d.driver_id
INNER JOIN Vehicles v ON r.vehicle_id = v.vehicle_id
INNER JOIN Payments p ON r.ride_id = p.ride_id
WHERE r.status = 'COMPLETED';

-- Q2. LEFT JOIN + AGGREGATION: Show all users and their total spend (even if 0).
SELECT u.first_name, u.last_name, COALESCE(SUM(p.amount), 0) AS total_spent
FROM Users u
LEFT JOIN Rides r ON u.user_id = r.user_id
LEFT JOIN Payments p ON r.ride_id = p.ride_id AND p.payment_status = 'SUCCESS'
GROUP BY u.user_id, u.first_name, u.last_name
ORDER BY total_spent DESC;

-- Q3. MATCHING SUBQUERY: Find drivers who drive LUXURY vehicles.
SELECT driver_id, first_name, last_name, avg_rating 
FROM Drivers 
WHERE driver_id IN (
    SELECT driver_id FROM Vehicles WHERE vehicle_type = 'LUXURY'
);

-- Q4. CORRELATED SUBQUERY: Users whose wallet balance is higher than the average wallet balance.
SELECT first_name, last_name, wallet_balance 
FROM Users u1 
WHERE wallet_balance > (
    SELECT AVG(wallet_balance) FROM Users u2
);

-- Q5. GROUP BY + HAVING: Find drivers with total revenue > $30.
SELECT d.driver_id, d.first_name, SUM(p.amount) as revenue_generated
FROM Drivers d
JOIN Rides r ON d.driver_id = r.driver_id
JOIN Payments p ON r.ride_id = p.ride_id
GROUP BY d.driver_id, d.first_name
HAVING revenue_generated > 30.00;

-- Q6. WINDOW FUNCTION (RANK): Rank drivers by their average rating natively.
SELECT 
    driver_id, 
    first_name, 
    avg_rating,
    RANK() OVER(ORDER BY avg_rating DESC) as leaderboard_rank
FROM Drivers;

-- Q7. WINDOW FUNCTION (PARTITION BY): Calculate cumulative revenue by payment method.
SELECT 
    payment_method, 
    amount, 
    SUM(amount) OVER(PARTITION BY payment_method ORDER BY transaction_date) as cumulative_revenue
FROM Payments
WHERE payment_status = 'SUCCESS';

-- Q8. REAL-WORLD INSIGHT: Cancellation Analysis - Count of rides by status to find drop-off %.
SELECT 
    status, 
    COUNT(ride_id) AS total_occurrences,
    ROUND((COUNT(ride_id) / (SELECT COUNT(*) FROM Rides)) * 100, 2) AS percentage_of_total
FROM Rides
GROUP BY status;

-- Q9. REAL-WORLD INSIGHT: Popular Pickup Zones (Most Demanded Locations).
SELECT 
    l.address_text AS pickup_location, 
    COUNT(r.ride_id) AS demand_volume
FROM Rides r
JOIN Locations l ON r.pickup_loc_id = l.location_id
GROUP BY l.location_id, l.address_text
ORDER BY demand_volume DESC;

-- Q10. COMPLEX MULTI-TIER: Identify the 3 most lucrative active drivers (Total Earnings).
SELECT 
    d.license_number,
    CONCAT(d.first_name, ' ', d.last_name) as full_name,
    v.model,
    COUNT(r.ride_id) as trips_completed,
    SUM(p.amount) as net_gross_revenue
FROM Drivers d
JOIN Vehicles v ON d.driver_id = v.driver_id
JOIN Rides r ON d.driver_id = r.driver_id
JOIN Payments p ON r.ride_id = p.ride_id
WHERE r.status = 'COMPLETED'
GROUP BY d.driver_id, v.model
ORDER BY net_gross_revenue DESC
LIMIT 3;
