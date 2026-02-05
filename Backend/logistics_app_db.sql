-- =========================
-- 1. TENANTS (COMPANIES)
-- =========================
CREATE TABLE tenants (
    tenant_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    company_code VARCHAR(50) NOT NULL UNIQUE,
    status ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

