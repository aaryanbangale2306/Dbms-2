# 🚖 NexaRide: Advanced Autonomous-Ready Ride Sharing Database System
**A Comprehensive Master-Level DBMS Architecture & Implementation**

## 1. 📖 Problem Statement & System Objectives

### System Description
The rapid growth of urban mobility demands a highly robust, scalable, and responsive database architecture capable of handling concurrent transactions, spatial data, dynamic pricing components, and complex user-driver assignments. "NexaRide" is a professional-grade Ride-Sharing Database System designed to power platforms akin to Uber or Lyft. 

### Objectives
- **Data Integrity & ACID properties:** Ensure flawless transaction handling (e.g., money deduction and ride state transitions).
- **Dynamic Entities:** Manage real-time state changes for Users, Drivers, Vehicles, and Rides.
- **Automated Validation:** Enforce strict business constraints directly at the database level utilizing Advanced Triggers.
- **Reporting & Analytics:** Process large historical data to draw business insights via Window Functions and Stored Procedures.

### Scope & Assumptions
- A Driver can register only one primary Vehicle at a time for simplicity in dispatching.
- Cross-currency functionality is out of scope; all transactions handle a default fiat currency.
- Surge pricing is influenced by time, represented abstractly via multipliers.

---

## 2. 🗺️ Entity-Relationship (ER) Diagram (Textual Representation)

### Entities & Attributes
1. **USER (Strong Entity)**
   - `user_id` (Primary Key)
   - `first_name`, `last_name`
   - `email`, `phone` (Unique, Alternate Keys)
   - `wallet_balance` (Derived/Calculated via Triggers)

2. **DRIVER (Strong Entity)**
   - `driver_id` (Primary Key)
   - `license_number` (Unique)
   - `status` (Multi-state: AVAILABLE, ON_RIDE, OFFLINE)
   - `avg_rating` (Derived mathematically from Ratings)

3. **VEHICLE (Weak Entity dependent on Driver / Strong depending on assumption)**
   - *Treated as Strong* for tracking lifecycle independently.
   - `vehicle_id` (Primary Key)
   - `license_plate` (Unique)
   - `type` (SEDAN, SUV, LUXURY)

4. **LOCATION (Strong Entity)**
   - `location_id` (Primary Key)
   - `latitude`, `longitude` (Composite Spatial Pair)
   - `address_string`

5. **RIDE (Core Transactional Entity)**
   - `ride_id` (Primary Key)
   - `distance_km`, `status`, `fare_estimated`

6. **PAYMENT (Weak Entity dependent on Ride)**
   - `payment_id` (Primary Key)
   - `amount`, `method`, `status`

7. **RATING (Weak Entity dependent on Ride)**
   - `rating_id` (Primary Key)
   - `score` (1-5 constraint)

### Relationships & Cardinalities
- **User `<Books>` Ride:** 1:N (A user can book multiple rides over time; a ride belongs to exactly one user).
- **Driver `<Fulfills>` Ride:** 1:N (A driver fulfills multiple rides; a single ride has one primary driver).
- **Vehicle `<Assigned to>` Ride:** 1:N.
- **Driver `<Owns/Drives>` Vehicle:** 1:N (Driver can own multiple vehicles, but operates one at a time).
- **Ride `<Starts at / Ends at>` Location:** M:1 (Multiple rides can start/end at the same location node).
- **Ride `<Has>` Payment:** 1:1.
- **Ride `<Receives>` Rating:** 1:2 (One ride can have a User->Driver rating, and Driver->User rating).

---

## 3. 🛡️ Relational Schema & Normalization Journey

### Unnormalized Form (UNF)
A singular monolithic table containing repeating groups and lists.
`Ride_Slip(Ride_ID, User_ID, User_Names, User_Phones, Driver_ID, Driver_Name, Vehicle_Reg, Route_Waypoints, Fare, Payment_Method)`

### 1st Normal Form (1NF)
*Rule: Eliminate repeating groups. Every attribute must be atomic.*
- Extracted `Route_Waypoints` into individual distinct `Pickup` and `Dropoff` locations.
- Enforced single distinct phone numbers.

### 2nd Normal Form (2NF)
*Rule: 1NF + No partial dependency (non-prime attributes must depend on the FULL primary key).*
If we had a composite key tracking `(Ride_ID, Stop_Sequence)`, driver details depending only on `Ride_ID` create partial dependencies.
- Separated `Rides` and `Users` to distinct tables to ensure user details rely solely on `User_ID`.

### 3rd Normal Form (3NF)
*Rule: 2NF + No transitive dependencies (non-prime attributes must not depend on other non-prime attributes).*
- In `Rides`, `Driver_Name` transitively depended on `Driver_ID` (which depends on `Ride_ID`).
- We extracted `Drivers` and `Vehicles` into their respective tables, relying strictly on their own Primary Keys. 

### Boyce-Codd Normal Form (BCNF)
*Rule: 3NF + Every determinant must be a candidate key.*
- Ensured that `license_plate` defines `vehicle_id` and vice-versa (both are candidate keys). 
- Final Schema fully compliant.

---

## 4. ⚡ Implementation Guide: Active Database Elements

### Stored Procedures (Business Logic Abstraction)
1. `sp_calculate_ride_fare`: Dynamically applies distance, base fare, and surge multipliers.
2. `sp_monthly_user_statement`: Generates detailed periodic billing ledgers for users.
3. `sp_driver_earnings_summary`: Analyzes overall performance, revenue generation, and commission cut.

### Advanced Triggers (Data Integrity & Automation)
1. `trg_driver_busy_on_accept` & `trg_driver_free_on_complete`: Manages multi-state driver availability (`ONLINE`, `ON_RIDE`, `OFFLINE`).
2. `trg_prevent_poor_driver_booking`: **Constraint Validation:** Aborts transactions if a driver's rating drops below 2.0.
3. `trg_update_driver_rating`: **Materialized View Update:** Auto-calculates driver average rating dynamically on every new user review.
4. `trg_process_wallet_payment`: Validates non-negative amounts and ensures sufficient user wallet balance before generating a 'SUCCESS' payment state.

---

## 5. 🖥️ Advanced Queries & Output Simulation

### Q1. Identify Top Earning Drivers (Complex Multi-Tier Join)
**Query Logic:** Joins Drivers, Vehicles, Rides, and Payments to compute net gross revenue per active driver, sorted descending.
**Simulated Console Output:**
| license_number | full_name       | model      | trips_completed | net_gross_revenue |
| :------------- | :-------------- | :--------- | :-------------- | :---------------- |
| LIC-1003       | Charles Leclerc | Purosangue | 1               | $65.00            |
| LIC-1001       | Max Verstappen  | Model 3    | 1               | $45.00            |
| LIC-1002       | Lewis Hamilton  | S-Class    | 1               | $15.50            |

### Q2. Driver Leaderboard (Window Function)
**Query Logic:** Utilizes `RANK() OVER(ORDER BY avg_rating DESC)` to natively rank all registered drivers without resorting to correlated subqueries.
**Simulated Console Output:**
| driver_id | first_name | avg_rating | leaderboard_rank |
| :-------- | :--------- | :--------- | :--------------- |
| 1         | Max        | 4.90       | 1                |
| 2         | Lewis      | 4.80       | 2                |
| 3         | Charles    | 4.70       | 3                |
| 4         | Lando      | 4.50       | 4                |
| 5         | Carlos     | 3.80       | 5                |

### Q3. Cancellation Analysis (Real-World Insight)
**Query Logic:** Subqueries and aggregations (`GROUP BY status`) to determine the platform's drop-off and overall successful conversion rates.
**Simulated Console Output:**
| status      | total_occurrences | percentage_of_total (%) |
| :---------- | :---------------- | :---------------------- |
| COMPLETED   | 1,284             | 75.40                   |
| IN_PROGRESS | 312               | 18.32                   |
| CANCELLED   | 107               | 6.28                    |

---

## 6. 💻 Conclusion & Future Scope

### Achievements
- Designed a production-ready **BCNF normalized schema** robust against update/delete anomalies.
- Implemented **Active DBMS elements** utilizing Triggers to automate state transitions and preserve data integrity dynamically.
- Devised **Complex analytical models** using Window functions to derive immediate business intelligence from transaction trails.
- Achieved an advanced **Front-End Design Language** utilizing glassmorphism, dynamic DOM injection, and state-driven UI to illustrate full-stack prowess.

### Limitations
- Spatial queries using simple Euclidean distances rather than PostGIS/MySQL Spatial native geometries due to standard SQL constraints.
- Surge pricing is statically triggered instead of utilizing AI/ML load prediction models.

### Future Scope
1. **Geospatial Indexing:** Migrate location data to `POINT` type utilizing R-trees for blazing fast proximity driver matching.
2. **Read Replicas & Sharding:** Horizontal partitioning of the `Rides` active table vs `Rides_History` archive table.
3. **WebSockets Integration:** Bridging Database triggers to Node.js backend using CDC (Change Data Capture) via Debezium for real-time dashboard UI updates.
