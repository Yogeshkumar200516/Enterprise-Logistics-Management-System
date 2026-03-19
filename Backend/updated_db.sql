CREATE DATABASE IF NOT EXISTS logistic_app3;
USE logistic_app3;

-- =============================================================
-- LOGISTICS APP — CLEAN FULL DATABASE SCHEMA
-- =============================================================


-- =========================
-- 1. TENANTS (COMPANIES)
-- =========================
CREATE TABLE tenants (
    tenant_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    company_code VARCHAR(50)  NOT NULL UNIQUE,
    status       ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    phone_no     VARCHAR(20),
    email        VARCHAR(150),
    address      TEXT,
    state        VARCHAR(100),
    pincode      VARCHAR(10),
    gst_no       VARCHAR(20),
    pan_no       VARCHAR(20)
);


-- =========================
-- 2. USERS
-- =========================
CREATE TABLE users (
    user_id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id        BIGINT NULL,
    role             ENUM('superadmin','admin','supervisor','user') NOT NULL,
    username         VARCHAR(100) NOT NULL UNIQUE,
    full_name        VARCHAR(100) NOT NULL,
    email            VARCHAR(150) NOT NULL UNIQUE,
    phone_number     VARCHAR(20)  NOT NULL,
    password         VARCHAR(255) NOT NULL,
    status           ENUM('ACTIVE','INACTIVE','SUSPENDED') DEFAULT 'ACTIVE',
    is_external_driver BOOLEAN DEFAULT FALSE,
    license_number   VARCHAR(50),
    vehicle_type     VARCHAR(50),
    vehicle_number   VARCHAR(50),
    last_login       DATETIME,
    created_by       BIGINT NULL,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    driver_status    ENUM('AVAILABLE','IN_DELIVERY','OFF_DUTY') DEFAULT 'AVAILABLE',

    CONSTRAINT fk_users_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_users_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id)
        ON DELETE SET NULL
);


-- =========================
-- 3. VEHICLES
-- =========================
CREATE TABLE vehicles (
    vehicle_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id      BIGINT NOT NULL,
    vehicle_type   VARCHAR(50),
    vehicle_number VARCHAR(50) UNIQUE,
    capacity       INT,
    is_temporary   BOOLEAN DEFAULT FALSE,
    status         ENUM('AVAILABLE','IN_USE','MAINTENANCE') DEFAULT 'AVAILABLE',
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);


-- =========================
-- 4. ORDERS
-- =========================
CREATE TABLE orders (
    order_id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id        BIGINT NOT NULL,
    order_reference  VARCHAR(100) UNIQUE,
    customer_name    VARCHAR(100),
    customer_address TEXT,
    pincode          VARCHAR(10),
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivery_status  ENUM('NOT_ASSIGNED','IN_PROGRESS','DELIVERED') DEFAULT 'NOT_ASSIGNED',
    delivered_at     DATETIME,

    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);


-- =========================
-- 5. ORDER ITEMS
-- =========================
CREATE TABLE order_items (
    item_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id     BIGINT NOT NULL,
    product_name VARCHAR(150),
    quantity     INT,
    is_fragile   BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON DELETE CASCADE
);


-- =========================
-- 6. DELIVERY ASSIGNMENTS
-- =========================
CREATE TABLE delivery_assignments (
    delivery_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id     BIGINT NOT NULL,
    vehicle_id    BIGINT NOT NULL,
    driver_id     BIGINT NOT NULL,
    supervisor_id BIGINT NOT NULL,
    status        ENUM(
        'ASSIGNED',
        'IN_TRANSIT',
        'DELIVERED',
        'PARTIALLY_DELIVERED'
    ) DEFAULT 'ASSIGNED',
    assigned_at   DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id)     REFERENCES tenants(tenant_id),
    FOREIGN KEY (vehicle_id)    REFERENCES vehicles(vehicle_id),
    FOREIGN KEY (driver_id)     REFERENCES users(user_id),
    FOREIGN KEY (supervisor_id) REFERENCES users(user_id)
);


-- =========================
-- 7. DELIVERY ITEMS
-- =========================
CREATE TABLE delivery_items (
    delivery_item_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    delivery_id      BIGINT NOT NULL,
    item_id          BIGINT NOT NULL,
    delivery_status  ENUM('PENDING','DELIVERED','DAMAGED') DEFAULT 'PENDING',
    proof_url        TEXT,
    delivered_at     DATETIME,

    FOREIGN KEY (delivery_id) REFERENCES delivery_assignments(delivery_id)
        ON DELETE CASCADE,
    FOREIGN KEY (item_id)     REFERENCES order_items(item_id)
);


-- =========================
-- 8. DAMAGE REPORTS
-- =========================
CREATE TABLE damage_reports (
    damage_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    delivery_item_id BIGINT NOT NULL,
    reported_by      BIGINT NOT NULL,
    description      TEXT,
    evidence_url     TEXT,
    reported_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (delivery_item_id) REFERENCES delivery_items(delivery_item_id)
        ON DELETE CASCADE,
    FOREIGN KEY (reported_by) REFERENCES users(user_id)
);


-- =========================
-- 9. SCRAP LOGS
-- =========================
CREATE TABLE scrap_logs (
    scrap_id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id         BIGINT NOT NULL,

    vehicle_id        BIGINT NOT NULL,
    driver_id         BIGINT NOT NULL,
    supervisor_id     BIGINT NOT NULL,
    collected_by      BIGINT NOT NULL,

    scrap_type        VARCHAR(100),
    quantity          INT,
    source            ENUM('INTERNAL','CUSTOMER') NOT NULL,

    pickup_address    TEXT,
    pickup_pincode    VARCHAR(10),
    collection_notes  TEXT,

    delivery_item_id  BIGINT,

    status ENUM(
        'ASSIGNED',
        'IN_TRANSIT',
        'COMPLETED',
        'APPROVED',
        'REJECTED'
    ) DEFAULT 'ASSIGNED',

    departure_time    DATETIME,
    completed_at      DATETIME,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id)        REFERENCES tenants(tenant_id),
    FOREIGN KEY (vehicle_id)       REFERENCES vehicles(vehicle_id),
    FOREIGN KEY (driver_id)        REFERENCES users(user_id),
    FOREIGN KEY (supervisor_id)    REFERENCES users(user_id),
    FOREIGN KEY (collected_by)     REFERENCES users(user_id),
    FOREIGN KEY (delivery_item_id) REFERENCES delivery_items(delivery_item_id)
);


-- =========================
-- 10. SCRAP ITEMS
-- =========================
CREATE TABLE scrap_items (
    scrap_item_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    scrap_id          BIGINT NOT NULL,
    item_description  VARCHAR(255) NOT NULL,
    quantity          INT NOT NULL DEFAULT 1,
    delivery_item_id  BIGINT,
    collection_status ENUM('PENDING','COLLECTED','DAMAGED') DEFAULT 'PENDING',
    proof_url         TEXT,
    collected_at      DATETIME,
    notes             TEXT,

    FOREIGN KEY (scrap_id) REFERENCES scrap_logs(scrap_id)
        ON DELETE CASCADE,
    FOREIGN KEY (delivery_item_id) REFERENCES delivery_items(delivery_item_id)
);


-- =========================
-- 11. AUDIT LOGS
-- =========================
CREATE TABLE audit_logs (
    log_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id   BIGINT NOT NULL,
    user_id     BIGINT NOT NULL,
    action      VARCHAR(255),
    entity_type VARCHAR(50),
    entity_id   BIGINT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id),
    FOREIGN KEY (user_id)   REFERENCES users(user_id)
);































USE logistic_app3;

-- =====================================================
-- 1. TENANTS
-- =====================================================
INSERT INTO tenants (company_name, company_code, phone_no, email, address, state, pincode, gst_no, pan_no)
VALUES
('FastMove Logistics', 'FML001', '9876543210', 'info@fastmove.com', 'Mumbai Central', 'Maharashtra', '400001', '27ABCDE1234F1Z5', 'ABCDE1234F'),
('QuickShift Transport', 'QST002', '9123456780', 'contact@quickshift.com', 'Bangalore South', 'Karnataka', '560001', '29ABCDE5678G1Z6', 'ABCDE5678G');


-- =====================================================
-- 2. USERS
-- =====================================================
INSERT INTO users (tenant_id, role, username, full_name, email, phone_number, password)
VALUES
(NULL, 'superadmin', 'SuperAdmin', 'Yogesh Kumar S', 'yogeshkumar.s.radha@gmail.com', '9080901518', 'Admin@123'),

(1, 'admin', 'admin1', 'Admin One', 'admin1@fastmove.com', '9000000002', 'hashedpassword'),
(1, 'supervisor', 'supervisor1', 'Supervisor One', 'supervisor1@fastmove.com', '9000000003', 'hashedpassword'),
(1, 'user', 'driver1', 'Driver One', 'driver1@fastmove.com', '9000000004', 'hashedpassword'),
(1, 'user', 'driver2', 'Driver Two', 'driver2@fastmove.com', '9000000005', 'hashedpassword'),

(2, 'admin', 'admin2', 'Admin Two', 'admin2@quickshift.com', '9000000006', 'hashedpassword'),
(2, 'supervisor', 'supervisor2', 'Supervisor Two', 'supervisor2@quickshift.com', '9000000007', 'hashedpassword'),
(2, 'user', 'driver3', 'Driver Three', 'driver3@quickshift.com', '9000000008', 'hashedpassword'),
(2, 'user', 'driver4', 'Driver Four', 'driver4@quickshift.com', '9000000009', 'hashedpassword');


-- =====================================================
-- 3. VEHICLES
-- =====================================================
INSERT INTO vehicles (tenant_id, vehicle_type, vehicle_number, capacity)
VALUES
(1, 'Truck', 'MH01AB1234', 5000),
(1, 'Van', 'MH01CD5678', 2000),
(2, 'Truck', 'KA05EF4321', 6000),
(2, 'Van', 'KA05GH8765', 2500);


-- =====================================================
-- 4. ORDERS (30 DATA)
-- =====================================================
INSERT INTO orders (tenant_id, order_reference, customer_name, customer_address, pincode)
VALUES
-- 15 Orders for Tenant 1
(1, 'ORD-FML-001', 'Amit Sharma', 'Andheri East, Mumbai', '400069'),
(1, 'ORD-FML-002', 'Rohit Mehta', 'Bandra West, Mumbai', '400050'),
(1, 'ORD-FML-003', 'Neha Verma', 'Powai, Mumbai', '400076'),
(1, 'ORD-FML-004', 'Sanjay Kumar', 'Thane West', '400601'),
(1, 'ORD-FML-005', 'Priya Nair', 'Dadar East', '400014'),
(1, 'ORD-FML-006', 'Kiran Patel', 'Borivali West', '400092'),
(1, 'ORD-FML-007', 'Vikas Singh', 'Kurla East', '400024'),
(1, 'ORD-FML-008', 'Anjali Rao', 'Malad West', '400064'),
(1, 'ORD-FML-009', 'Ramesh Iyer', 'Goregaon East', '400063'),
(1, 'ORD-FML-010', 'Deepak Joshi', 'Vashi, Navi Mumbai', '400703'),
(1, 'ORD-FML-011', 'Harish Shetty', 'Mulund West', '400080'),
(1, 'ORD-FML-012', 'Pooja Desai', 'Colaba, Mumbai', '400005'),
(1, 'ORD-FML-013', 'Arun Yadav', 'Sion East', '400022'),
(1, 'ORD-FML-014', 'Meena Gupta', 'Kalyan West', '421301'),
(1, 'ORD-FML-015', 'Nitin Jain', 'Panvel', '410206'),

-- 15 Orders for Tenant 2
(2, 'ORD-QST-016', 'Rahul Reddy', 'Indiranagar, Bangalore', '560038'),
(2, 'ORD-QST-017', 'Sneha Kapoor', 'Whitefield', '560066'),
(2, 'ORD-QST-018', 'Ajay Kumar', 'Koramangala', '560034'),
(2, 'ORD-QST-019', 'Lakshmi Devi', 'Jayanagar', '560041'),
(2, 'ORD-QST-020', 'Manoj Das', 'Hebbal', '560024'),
(2, 'ORD-QST-021', 'Shreya Menon', 'BTM Layout', '560076'),
(2, 'ORD-QST-022', 'Suresh Babu', 'Electronic City', '560100'),
(2, 'ORD-QST-023', 'Anita Rao', 'Yelahanka', '560064'),
(2, 'ORD-QST-024', 'Karthik Gowda', 'HSR Layout', '560102'),
(2, 'ORD-QST-025', 'Divya Sharma', 'Rajajinagar', '560010'),
(2, 'ORD-QST-026', 'Prakash Naidu', 'Marathahalli', '560037'),
(2, 'ORD-QST-027', 'Bhavana Iyer', 'Banashankari', '560070'),
(2, 'ORD-QST-028', 'Sunil Kumar', 'Malleshwaram', '560003'),
(2, 'ORD-QST-029', 'Geeta Rani', 'KR Puram', '560036'),
(2, 'ORD-QST-030', 'Mahesh Shetty', 'Sarjapur Road', '560035');


-- =====================================================
-- 5. ORDER ITEMS (2 ITEMS PER ORDER = 60 TOTAL)
-- =====================================================
INSERT INTO order_items (order_id, product_name, quantity, is_fragile)
SELECT order_id, 'LED TV', 1, TRUE FROM orders
UNION ALL
SELECT order_id, 'Refrigerator', 1, FALSE FROM orders;


-- =====================================================
-- 6. DELIVERY ASSIGNMENTS
-- =====================================================
INSERT INTO delivery_assignments (tenant_id, vehicle_id, driver_id, supervisor_id)
VALUES
(1, 1, 4, 3),
(1, 2, 5, 3),
(2, 3, 8, 7),
(2, 4, 9, 7);


-- =====================================================
-- 7. DELIVERY ITEMS
-- =====================================================
INSERT INTO delivery_items (delivery_id, item_id)
SELECT 1, item_id FROM order_items WHERE order_id BETWEEN 1 AND 5;

INSERT INTO delivery_items (delivery_id, item_id)
SELECT 2, item_id FROM order_items WHERE order_id BETWEEN 6 AND 10;

INSERT INTO delivery_items (delivery_id, item_id)
SELECT 3, item_id FROM order_items WHERE order_id BETWEEN 16 AND 20;

INSERT INTO delivery_items (delivery_id, item_id)
SELECT 4, item_id FROM order_items WHERE order_id BETWEEN 21 AND 25;


-- =====================================================
-- 8. DAMAGE REPORT
-- =====================================================
INSERT INTO damage_reports (delivery_item_id, reported_by, description)
VALUES
(1, 4, 'Screen cracked during transport');


-- =====================================================
-- 9. SCRAP LOG
-- =====================================================
INSERT INTO scrap_logs
(tenant_id, vehicle_id, driver_id, supervisor_id, collected_by, scrap_type, quantity, source, pickup_address, pickup_pincode)
VALUES
(1, 1, 4, 3, 4, 'Damaged Electronics', 2, 'INTERNAL', 'Warehouse A, Mumbai', '400001');


-- =====================================================
-- 10. SCRAP ITEMS
-- =====================================================
INSERT INTO scrap_items
(scrap_id, item_description, quantity)
VALUES
(1, 'Broken LED TV', 1),
(1, 'Damaged Refrigerator', 1);


-- =====================================================
-- 11. AUDIT LOGS
-- =====================================================
INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id)
VALUES
(1, 2, 'Created Order', 'ORDER', 1),
(1, 3, 'Assigned Delivery', 'DELIVERY', 1),
(2, 6, 'Created Order', 'ORDER', 16);