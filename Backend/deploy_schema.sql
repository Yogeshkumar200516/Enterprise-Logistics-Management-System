-- =============================================================
-- LOGISTICS APP — CLEAN FULL DATABASE SCHEMA (FOR DEPLOYMENT)
-- =============================================================

-- =========================
-- 1. TENANTS (COMPANIES)
-- =========================
CREATE TABLE IF NOT EXISTS tenants (
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
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS vehicles (
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
CREATE TABLE IF NOT EXISTS orders (
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
CREATE TABLE IF NOT EXISTS order_items (
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
CREATE TABLE IF NOT EXISTS delivery_assignments (
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
CREATE TABLE IF NOT EXISTS delivery_items (
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
CREATE TABLE IF NOT EXISTS damage_reports (
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
CREATE TABLE IF NOT EXISTS scrap_logs (
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
CREATE TABLE IF NOT EXISTS scrap_items (
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
CREATE TABLE IF NOT EXISTS audit_logs (
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

-- =====================================================
-- INITIAL DATA
-- =====================================================

INSERT INTO tenants (company_name, company_code, phone_no, email, address, state, pincode, gst_no, pan_no)
VALUES
('FastMove Logistics', 'FML001', '9876543210', 'info@fastmove.com', 'Mumbai Central', 'Maharashtra', '400001', '27ABCDE1234F1Z5', 'ABCDE1234F'),
('QuickShift Transport', 'QST002', '9123456780', 'contact@quickshift.com', 'Bangalore South', 'Karnataka', '560001', '29ABCDE5678G1Z6', 'ABCDE5678G')
ON DUPLICATE KEY UPDATE company_name=VALUES(company_name);

INSERT INTO users (tenant_id, role, username, full_name, email, phone_number, password)
VALUES
(NULL, 'superadmin', 'SuperAdmin', 'Yogesh Kumar S', 'yogeshkumar.s.radha@gmail.com', '9080901518', 'Admin@123'),
(1, 'admin', 'admin1', 'Admin One', 'admin1@fastmove.com', '9000000002', 'hashedpassword'),
(1, 'supervisor', 'supervisor1', 'Supervisor One', 'supervisor1@fastmove.com', '9000000003', 'hashedpassword')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);
