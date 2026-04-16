-- =====================================================================
-- 🚖 NexaRide: Triggers & Stored Procedures
-- Implements active business logic at the Database Layer.
-- =====================================================================

USE nexaride_db;

DELIMITER $$

-- ---------------------------------------------------------------------
-- 🛡️ 1. ADVANCED TRIGGERS (Min 5)
-- ---------------------------------------------------------------------

-- Trigger 1: Auto-update Driver Status When Ride is Accepted
-- Logic: When a rider requests and a driver is assigned, lock the driver.
CREATE TRIGGER trg_driver_busy_on_accept
AFTER UPDATE ON Rides
FOR EACH ROW
BEGIN
    IF NEW.status = 'IN_PROGRESS' AND OLD.status != 'IN_PROGRESS' THEN
        UPDATE Drivers SET status = 'ON_RIDE' WHERE driver_id = NEW.driver_id;
    END IF;
END$$

-- Trigger 2: Auto-update Driver Status When Ride is Completed
-- Logic: Free up the driver for the next ride once completed or cancelled.
CREATE TRIGGER trg_driver_free_on_complete
AFTER UPDATE ON Rides
FOR EACH ROW
BEGIN
    IF (NEW.status = 'COMPLETED' OR NEW.status = 'CANCELLED') AND OLD.status = 'IN_PROGRESS' THEN
        UPDATE Drivers SET status = 'AVAILABLE' WHERE driver_id = NEW.driver_id;
    END IF;
END$$

-- Trigger 3: Prevent Booking if Driver Rating is Too Low (< 2.0)
-- Logic: Maintains service quality. Aborts transaction if driver is substandard.
CREATE TRIGGER trg_prevent_poor_driver_booking
BEFORE UPDATE ON Rides
FOR EACH ROW
BEGIN
    DECLARE current_rating DECIMAL(3,2);
    IF NEW.driver_id IS NOT NULL AND OLD.driver_id IS NULL THEN
        SELECT avg_rating INTO current_rating FROM Drivers WHERE driver_id = NEW.driver_id;
        IF current_rating < 2.00 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Booking Failed: Assigned Driver has a rating below acceptable threshold (2.0).';
        END IF;
    END IF;
END$$

-- Trigger 4: Auto-Calculate Driver Average Rating on New Rating Insert
-- Logic: Maintains a dynamic materialized view of driver performance.
CREATE TRIGGER trg_update_driver_rating
AFTER INSERT ON Ratings
FOR EACH ROW
BEGIN
    DECLARE assigned_driver INT;
    IF NEW.rater_type = 'USER' THEN
        -- Find the driver for this ride
        SELECT driver_id INTO assigned_driver FROM Rides WHERE ride_id = NEW.ride_id;
        -- Update the Driver table with the newly calculated average
        UPDATE Drivers 
        SET avg_rating = (
            SELECT AVG(rating_score) 
            FROM Ratings r 
            JOIN Rides rd ON r.ride_id = rd.ride_id 
            WHERE rd.driver_id = assigned_driver AND r.rater_type = 'USER'
        )
        WHERE driver_id = assigned_driver;
    END IF;
END$$

-- Trigger 5: Restrict Invalid Payments & Auto-Deduct from Wallet
-- Logic: No negative payments allowed. If wallet is used, deduct the balance.
CREATE TRIGGER trg_process_wallet_payment
BEFORE INSERT ON Payments
FOR EACH ROW
BEGIN
    DECLARE current_balance DECIMAL(10,2);
    DECLARE u_id INT;

    IF NEW.amount <= 0 THEN
         SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payment Error: Amount must be strictly positive.';
    END IF;

    IF NEW.payment_method = 'WALLET' THEN
        SELECT user_id INTO u_id FROM Rides WHERE ride_id = NEW.ride_id;
        SELECT wallet_balance INTO current_balance FROM Users WHERE user_id = u_id;
        
        IF current_balance < NEW.amount THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payment Error: Insufficient Wallet Balance.';
        ELSE
            UPDATE Users SET wallet_balance = wallet_balance - NEW.amount WHERE user_id = u_id;
            SET NEW.payment_status = 'SUCCESS';
        END IF;
    END IF;
END$$


-- ---------------------------------------------------------------------
-- ⚙️ 2. STORED PROCEDURES (Min 3)
-- ---------------------------------------------------------------------

-- Procedure 1: Dynamic Fare Calculation
-- Uses a base fare of $2.50, $1.20 per km, and applies surge multiplier.
CREATE PROCEDURE sp_calculate_ride_fare(IN p_ride_id INT, IN p_surge_multiplier DECIMAL(3,2))
BEGIN
    DECLARE v_distance DECIMAL(6,2);
    DECLARE v_calculated_fare DECIMAL(8,2);
    
    SELECT distance_km INTO v_distance FROM Rides WHERE ride_id = p_ride_id;
    
    -- Formula: (Base + (Distance * RatePerKm)) * Surge
    SET v_calculated_fare = (2.50 + (v_distance * 1.20)) * p_surge_multiplier;
    
    UPDATE Rides 
    SET fare_estimated = v_calculated_fare, fare_final = v_calculated_fare
    WHERE ride_id = p_ride_id;
    
    SELECT v_calculated_fare AS "Estimated Fare Computed";
END$$

-- Procedure 2: Monthly Ride Report per User
-- Ideal for generating billing statements.
CREATE PROCEDURE sp_monthly_user_statement(IN p_user_id INT, IN p_month INT, IN p_year INT)
BEGIN
    SELECT 
        r.ride_id, 
        DATE(r.start_time) AS ride_date,
        l1.address_text AS pickup,
        l2.address_text AS dropoff,
        r.distance_km,
        p.amount AS amount_paid,
        p.payment_method
    FROM Rides r
    JOIN Payments p ON r.ride_id = p.ride_id
    JOIN Locations l1 ON r.pickup_loc_id = l1.location_id
    JOIN Locations l2 ON r.dropoff_loc_id = l2.location_id
    WHERE r.user_id = p_user_id 
      AND MONTH(r.start_time) = p_month 
      AND YEAR(r.start_time) = p_year
      AND r.status = 'COMPLETED';
END$$

-- Procedure 3: Enterprise Driver Earnings Report
-- Analyzes performance and revenue generation for a driver over a timeframe.
CREATE PROCEDURE sp_driver_earnings_summary(IN p_driver_id INT, IN p_days_history INT)
BEGIN
    SELECT 
        d.first_name,
        d.last_name,
        COUNT(r.ride_id) AS total_rides_completed,
        SUM(p.amount) AS total_revenue_generated,
        (SUM(p.amount) * 0.80) AS estimated_driver_payout, -- 20% platform commission
        AVG(rt.rating_score) AS average_rating_current_period
    FROM Rides r
    JOIN Drivers d ON r.driver_id = d.driver_id
    JOIN Payments p ON r.ride_id = p.ride_id
    LEFT JOIN Ratings rt ON r.ride_id = rt.ride_id AND rt.rater_type = 'USER'
    WHERE r.driver_id = p_driver_id
      AND r.status = 'COMPLETED'
      AND r.start_time >= DATE_SUB(CURRENT_DATE, INTERVAL p_days_history DAY)
    GROUP BY d.driver_id;
END$$

DELIMITER ;
