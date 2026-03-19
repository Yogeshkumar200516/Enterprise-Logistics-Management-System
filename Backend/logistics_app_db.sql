-- =========================
-- 1. TENANTS (COMPANIES)
-- =========================
CREATE TABLE tenants (
    tenant_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    company_code VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    phone_no VARCHAR(20) NULL,
    email VARCHAR(150) NULL,
    address TEXT NULL,
    state VARCHAR(100) NULL,
    pincode VARCHAR(10) NULL,
    gst_no VARCHAR(20) NULL,
    pan_no VARCHAR(20) NULL;
);

-- =========================
-- 2. USERS (GIVEN TABLE)
-- =========================
CREATE TABLE users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,

    tenant_id BIGINT NULL,
    -- NULL for Super Admin

    role ENUM('superadmin','admin','supervisor','user') NOT NULL,

    username VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,

    status ENUM('ACTIVE','INACTIVE','SUSPENDED') DEFAULT 'ACTIVE',

    is_external_driver BOOLEAN DEFAULT FALSE,

    license_number VARCHAR(50) NULL,
    vehicle_type VARCHAR(50) NULL,
    vehicle_number VARCHAR(50) NULL,

    last_login DATETIME NULL,

    created_by BIGINT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    driver_status ENUM('AVAILABLE','IN_DELIVERY','OFF_DUTY') DEFAULT 'AVAILABLE'

    CONSTRAINT fk_users_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(tenant_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_users_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);


-- =========================
-- 3. VEHICLES
-- =========================
CREATE TABLE vehicles (
    vehicle_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    vehicle_type VARCHAR(50),
    vehicle_number VARCHAR(50) UNIQUE,
    capacity INT,
    is_temporary BOOLEAN DEFAULT FALSE,
    status ENUM('AVAILABLE','IN_USE','MAINTENANCE') DEFAULT 'AVAILABLE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- =========================
-- 4. ORDERS
-- =========================
CREATE TABLE orders (
    order_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    order_reference VARCHAR(100) UNIQUE,
    customer_name VARCHAR(100),
    customer_address TEXT,
    pincode VARCHAR(10) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivery_status ENUM('NOT_ASSIGNED','IN_PROGRESS','DELIVERED') DEFAULT 'NOT_ASSIGNED',
    delivered_at DATETIME NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);


-- =========================
-- 5. ORDER ITEMS
-- =========================
CREATE TABLE order_items (
    item_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_name VARCHAR(150),
    quantity INT,
    is_fragile BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

-- =========================
-- 6. DELIVERY ASSIGNMENTS
-- =========================
CREATE TABLE delivery_assignments (
    delivery_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    vehicle_id BIGINT NOT NULL,
    driver_id BIGINT NOT NULL,
    supervisor_id BIGINT NOT NULL,
    status ENUM(
        'ASSIGNED',
        'IN_TRANSIT',
        'DELIVERED',
        'PARTIALLY_DELIVERED'
    ) DEFAULT 'ASSIGNED',
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    FOREIGN KEY (driver_id) REFERENCES users(user_id),
    FOREIGN KEY (supervisor_id) REFERENCES users(user_id)
);

-- =========================
-- 7. DELIVERY ITEMS
-- =========================
CREATE TABLE delivery_items (
    delivery_item_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    delivery_id BIGINT NOT NULL,
    item_id BIGINT NOT NULL,
    delivery_status ENUM(
        'PENDING',
        'DELIVERED',
        'DAMAGED'
    ) DEFAULT 'PENDING',
    proof_url TEXT,
    delivered_at DATETIME,
    FOREIGN KEY (delivery_id) REFERENCES delivery_assignments(delivery_id),
    FOREIGN KEY (item_id) REFERENCES order_items(item_id)
);

-- =========================
-- 8. DAMAGE REPORTS
-- =========================
CREATE TABLE damage_reports (
    damage_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    delivery_item_id BIGINT NOT NULL,
    reported_by BIGINT NOT NULL,
    description TEXT,
    evidence_url TEXT,
    reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (delivery_item_id) REFERENCES delivery_items(delivery_item_id),
    FOREIGN KEY (reported_by) REFERENCES users(user_id)
);

-- =========================
-- 9. SCRAP LOGS
-- =========================
CREATE TABLE scrap_logs (
    scrap_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    delivery_item_id BIGINT NULL,
    collected_by BIGINT NOT NULL,
    scrap_type VARCHAR(100),
    quantity INT,
    source ENUM('INTERNAL','CUSTOMER'),
    status ENUM('COLLECTED','APPROVED','REJECTED') DEFAULT 'COLLECTED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (delivery_item_id) REFERENCES delivery_items(delivery_item_id),
    FOREIGN KEY (collected_by) REFERENCES users(user_id)
);

-- =========================
-- 10. AUDIT / HISTORY LOGS
-- =========================
CREATE TABLE audit_logs (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    action VARCHAR(255),
    entity_type VARCHAR(50),
    entity_id BIGINT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);




















-- =========================
-- 1. TENANTS (COMPANIES)
-- =========================
INSERT INTO tenants (company_name, company_code, status) VALUES
('Mahisha Logistics Pvt Ltd', 'MIT001', 'ACTIVE'),
('Orion Supply Chain', 'OSC002', 'ACTIVE');

-- =========================
-- 2. USERS
-- =========================

-- Super Admin (no tenant)
INSERT INTO users (
    tenant_id, role, username, full_name, email, phone_number, password
) VALUES (
    NULL, 'superadmin', 'superadmin',
    'System Super Admin', 'superadmin@system.com',
    '9999999999', 'hashed_password'
);

-- Admins
INSERT INTO users (
    tenant_id, role, username, full_name, email, phone_number, password, created_by
) VALUES
(1, 'admin', 'admin_mit', 'MIT Admin', 'admin@mit.com', '8888888881', 'hashed_password', 1),
(2, 'admin', 'admin_osc', 'OSC Admin', 'admin@osc.com', '8888888882', 'hashed_password', 1);

-- Supervisors
INSERT INTO users (
    tenant_id, role, username, full_name, email, phone_number, password, created_by
) VALUES
(1, 'supervisor', 'sup_mit_1', 'MIT Supervisor', 'sup1@mit.com', '7777777771', 'hashed_password', 2);

-- Drivers (Users)
INSERT INTO users (
    tenant_id, role, username, full_name, email, phone_number,
    password, license_number, vehicle_type, is_external_driver, created_by
) VALUES
(1, 'user', 'driver_mit_1', 'MIT Driver One', 'driver1@mit.com',
 '6666666661', 'hashed_password', 'DL12345', 'Truck', FALSE, 2),

(1, 'user', 'driver_temp_1', 'Temp Driver', 'tempdriver@mit.com',
 '6666666662', 'hashed_password', 'DL67890', 'Van', TRUE, 3);

-- =========================
-- 3. VEHICLES
-- =========================
INSERT INTO vehicles (
    tenant_id, vehicle_type, vehicle_number, capacity, is_temporary
) VALUES
(1, 'Truck', 'TN09AB1234', 1000, FALSE),
(1, 'Van', 'TN10CD5678', 500, TRUE);

-- =========================
-- 4. ORDERS
-- =========================
INSERT INTO orders (
    tenant_id, order_reference, customer_name, customer_address
) VALUES
(1, 'ORD-MIT-001', 'Ramesh Kumar', 'Chennai, Tamil Nadu'),
(1, 'ORD-MIT-002', 'Suresh Patel', 'Bangalore, Karnataka');

-- =========================
-- 5. ORDER ITEMS
-- =========================
INSERT INTO order_items (
    order_id, product_name, quantity, is_fragile
) VALUES
(1, 'Washing Machine', 1, TRUE),
(1, 'Refrigerator', 1, TRUE),
(2, 'Office Chairs', 5, FALSE);

-- =========================
-- 6. DELIVERY ASSIGNMENTS
-- =========================
INSERT INTO delivery_assignments (
    tenant_id, vehicle_id, driver_id, supervisor_id, status
) VALUES
(1, 1, 5, 4, 'IN_TRANSIT');

-- =========================
-- 7. DELIVERY ITEMS
-- =========================
INSERT INTO delivery_items (
    delivery_id, item_id, delivery_status
) VALUES
(1, 1, 'DELIVERED'),
(1, 2, 'DAMAGED'),
(1, 3, 'DELIVERED');

-- =========================
-- 8. DAMAGE REPORTS
-- =========================
INSERT INTO damage_reports (
    delivery_item_id, reported_by, description, evidence_url
) VALUES
(2, 5, 'Refrigerator damaged during transport',
 'https://cdn.example.com/damage/fridge1.jpg');

-- =========================
-- 9. SCRAP LOGS
-- =========================
INSERT INTO scrap_logs (
    tenant_id, delivery_item_id, collected_by,
    scrap_type, quantity, source, status
) VALUES
(1, 2, 5, 'Metal Scrap', 1, 'INTERNAL', 'COLLECTED'),
(1, NULL, 5, 'Old Washing Machine', 1, 'CUSTOMER', 'APPROVED');

-- =========================
-- 10. AUDIT LOGS
-- =========================
INSERT INTO audit_logs (
    tenant_id, user_id, action, entity_type, entity_id
) VALUES
(1, 2, 'Created Supervisor', 'USER', 4),
(1, 4, 'Assigned Delivery', 'DELIVERY', 1),
(1, 5, 'Reported Damage', 'DAMAGE_REPORT', 1),
(1, 5, 'Collected Scrap', 'SCRAP', 1);









INSERT INTO orders (tenant_id, order_reference, customer_name, customer_address) VALUES
(1, 'ORD-MIT-003', 'Arun Kumar', 'Chennai, Tamil Nadu'),
(1, 'ORD-MIT-004', 'Vijay Singh', 'Madurai, Tamil Nadu'),
(1, 'ORD-MIT-005', 'Rahul Mehta', 'Coimbatore, Tamil Nadu'),
(1, 'ORD-MIT-006', 'Sanjay Verma', 'Trichy, Tamil Nadu'),
(1, 'ORD-MIT-007', 'Anil Sharma', 'Salem, Tamil Nadu'),
(1, 'ORD-MIT-008', 'Prakash Rao', 'Erode, Tamil Nadu'),
(1, 'ORD-MIT-009', 'Karthik R', 'Vellore, Tamil Nadu'),
(1, 'ORD-MIT-010', 'Naveen Joshi', 'Tiruppur, Tamil Nadu'),

(1, 'ORD-MIT-011', 'Rohit Agarwal', 'Bangalore, Karnataka'),
(1, 'ORD-MIT-012', 'Amit Patel', 'Mysore, Karnataka'),
(1, 'ORD-MIT-013', 'Sunil Shah', 'Hubli, Karnataka'),
(1, 'ORD-MIT-014', 'Deepak Jain', 'Mangalore, Karnataka'),
(1, 'ORD-MIT-015', 'Manoj Kulkarni', 'Belgaum, Karnataka'),

(1, 'ORD-MIT-016', 'Harish Iyer', 'Kochi, Kerala'),
(1, 'ORD-MIT-017', 'Suresh Nair', 'Trivandrum, Kerala'),
(1, 'ORD-MIT-018', 'Ramesh Pillai', 'Calicut, Kerala'),

(1, 'ORD-MIT-019', 'Ajay Gupta', 'Hyderabad, Telangana'),
(1, 'ORD-MIT-020', 'Vikas Reddy', 'Warangal, Telangana'),
(1, 'ORD-MIT-021', 'Kiran Rao', 'Karimnagar, Telangana'),

(1, 'ORD-MIT-022', 'Mahesh Yadav', 'Mumbai, Maharashtra'),
(1, 'ORD-MIT-023', 'Rajat Malhotra', 'Pune, Maharashtra'),
(1, 'ORD-MIT-024', 'Siddharth Kulkarni', 'Nashik, Maharashtra'),
(1, 'ORD-MIT-025', 'Nikhil Patil', 'Nagpur, Maharashtra'),

(1, 'ORD-MIT-026', 'Aakash Mishra', 'Bhopal, MP'),
(1, 'ORD-MIT-027', 'Ravi Choudhary', 'Indore, MP'),

(1, 'ORD-MIT-028', 'Pankaj Tiwari', 'Lucknow, UP'),
(1, 'ORD-MIT-029', 'Alok Verma', 'Kanpur, UP'),
(1, 'ORD-MIT-030', 'Shubham Gupta', 'Noida, UP'),

(1, 'ORD-MIT-031', 'Dinesh Solanki', 'Ahmedabad, Gujarat'),
(1, 'ORD-MIT-032', 'Hardik Patel', 'Surat, Gujarat'),
(1, 'ORD-MIT-033', 'Jignesh Shah', 'Vadodara, Gujarat'),

(1, 'ORD-MIT-034', 'Saurabh Roy', 'Kolkata, WB'),
(1, 'ORD-MIT-035', 'Ankit Das', 'Howrah, WB'),

(1, 'ORD-MIT-036', 'Rohit Sen', 'Patna, Bihar'),
(1, 'ORD-MIT-037', 'Manish Kumar', 'Gaya, Bihar'),

(1, 'ORD-MIT-038', 'Arvind Singh', 'Jaipur, Rajasthan'),
(1, 'ORD-MIT-039', 'Lokesh Meena', 'Kota, Rajasthan'),

(1, 'ORD-MIT-040', 'Devender Kumar', 'Delhi'),
(1, 'ORD-MIT-041', 'Mohit Arora', 'Gurgaon, Haryana'),
(1, 'ORD-MIT-042', 'Kapil Bansal', 'Faridabad, Haryana'),

(1, 'ORD-MIT-043', 'Sahil Khan', 'Chandigarh'),
(1, 'ORD-MIT-044', 'Imran Ali', 'Amritsar, Punjab'),

(1, 'ORD-MIT-045', 'Rakesh Negi', 'Dehradun, Uttarakhand'),
(1, 'ORD-MIT-046', 'Nitin Rawat', 'Haldwani, Uttarakhand'),

(1, 'ORD-MIT-047', 'Vivek Pandey', 'Ranchi, Jharkhand'),
(1, 'ORD-MIT-048', 'Anand Sinha', 'Jamshedpur, Jharkhand'),

(1, 'ORD-MIT-049', 'Praveen Chawla', 'Raipur, Chhattisgarh'),
(1, 'ORD-MIT-050', 'Yogesh Thakur', 'Bilaspur, Chhattisgarh'),
(1, 'ORD-MIT-051', 'Ashok Lal', 'Shimla, Himachal Pradesh'),
(1, 'ORD-MIT-052', 'Neeraj Rana', 'Solan, Himachal Pradesh');






INSERT INTO order_items (order_id, product_name, quantity, is_fragile) VALUES
-- ORD-MIT-003
(3, 'LED TV 42 Inch', 1, TRUE),
(3, 'Wall Mount Stand', 1, FALSE),

-- ORD-MIT-004
(4, 'Washing Machine', 1, TRUE),
(4, 'Detergent Pack', 2, FALSE),

-- ORD-MIT-005
(5, 'Refrigerator', 1, TRUE),
(5, 'Voltage Stabilizer', 1, FALSE),

-- ORD-MIT-006
(6, 'Office Desk', 2, FALSE),
(6, 'Office Chair', 4, FALSE),

-- ORD-MIT-007
(7, 'Microwave Oven', 1, TRUE),
(7, 'Cookware Set', 1, FALSE),

-- ORD-MIT-008
(8, 'Air Conditioner', 1, TRUE),
(8, 'Copper Pipe Kit', 1, FALSE),

-- ORD-MIT-009
(9, 'Dining Table', 1, FALSE),
(9, 'Dining Chairs', 4, FALSE),

-- ORD-MIT-010
(10, 'Laptop', 2, TRUE),
(10, 'Laptop Bag', 2, FALSE),

-- ORD-MIT-011
(11, 'Printer', 1, TRUE),
(11, 'Ink Cartridge', 3, FALSE),

-- ORD-MIT-012
(12, 'Sofa Set', 1, FALSE),
(12, 'Cushion Set', 5, FALSE),

-- ORD-MIT-013
(13, 'Water Purifier', 1, TRUE),
(13, 'Filter Kit', 1, FALSE),

-- ORD-MIT-014
(14, 'Gas Stove', 1, TRUE),
(14, 'Gas Cylinder Stand', 1, FALSE),

-- ORD-MIT-015
(15, 'Bookshelf', 2, FALSE),
(15, 'Study Lamp', 2, TRUE),

-- ORD-MIT-016
(16, 'Ceiling Fan', 3, FALSE),
(16, 'Voltage Regulator', 1, FALSE),

-- ORD-MIT-017
(17, 'Smartphone', 3, TRUE),
(17, 'Phone Cover', 3, FALSE),

-- ORD-MIT-018
(18, 'Bed Frame', 1, FALSE),
(18, 'Mattress', 1, TRUE),

-- ORD-MIT-019
(19, 'Desktop PC', 2, TRUE),
(19, 'UPS', 2, FALSE),

-- ORD-MIT-020
(20, 'Gym Equipment Set', 1, FALSE),
(20, 'Yoga Mat', 5, FALSE),

-- ORD-MIT-021
(21, 'Music System', 1, TRUE),
(21, 'Speaker Stand', 2, FALSE),

-- ORD-MIT-022
(22, 'Wardrobe', 1, FALSE),
(22, 'Mirror Panel', 1, TRUE),

-- ORD-MIT-023
(23, 'TV Stand', 2, FALSE),
(23, 'Decor Items', 4, TRUE),

-- ORD-MIT-024
(24, 'Water Heater', 2, TRUE),
(24, 'Piping Kit', 2, FALSE),

-- ORD-MIT-025
(25, 'Tool Kit', 3, FALSE),
(25, 'Safety Gloves', 10, FALSE);
