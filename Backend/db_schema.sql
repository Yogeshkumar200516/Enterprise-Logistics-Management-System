-- Create the database with UTF-8 support
CREATE DATABASE IF NOT EXISTS gym_management_system
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE gym_management_system;

-- 1. Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Password hash (bcrypt recommended)
    role ENUM('admin', 'member', 'trainer') NOT NULL,
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Members Table
CREATE TABLE members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(15),
    address TEXT,
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    join_date DATE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    emergency_contact VARCHAR(100),
    membership_type VARCHAR(50),
    profile_picture_url VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX (user_id)
);

-- 3. Fee Packages Table
CREATE TABLE fee_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_name VARCHAR(100),
    description TEXT,
    amount DECIMAL(10,2),
    duration ENUM('monthly', 'quarterly', 'yearly'),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Member Fees Table
CREATE TABLE member_fees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_no VARCHAR(100) UNIQUE,
    member_id INT,
    package_id INT,
    due_date DATE,
    paid_date DATE,
    amount_paid DECIMAL(10,2),
    payment_mode VARCHAR(50),
    receipt_url VARCHAR(255),
    transaction_id VARCHAR(100),
    remarks TEXT,
    status ENUM('paid', 'pending') DEFAULT 'pending',
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (package_id) REFERENCES fee_packages(id)
);

-- 5. Notifications Table
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    message TEXT,
    target_role ENUM('member', 'trainer', 'all'),
    sent BOOLEAN DEFAULT FALSE,
    expiry_date DATE,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 6. Supplements Table
CREATE TABLE supplements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) UNIQUE,
    name VARCHAR(100),
    description TEXT,
    category VARCHAR(50),
    price DECIMAL(10,2),
    stock_quantity INT,
    expiry_date DATE,
    supplier_name VARCHAR(100),
    image_url VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Orders Table
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE,
    member_id INT,
    total_amount DECIMAL(10,2),
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    payment_status ENUM('paid', 'pending') DEFAULT 'pending',
    delivery_status ENUM('pending', 'delivered', 'cancelled') DEFAULT 'pending',
    discount_applied DECIMAL(10,2),
    coupon_code VARCHAR(50),
    FOREIGN KEY (member_id) REFERENCES members(id)
);

-- 8. Order Items Table
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    supplement_id INT,
    quantity INT,
    price DECIMAL(10,2),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (supplement_id) REFERENCES supplements(id)
);

-- 9. Diet Plans Table
CREATE TABLE diet_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT,
    title VARCHAR(100),
    description TEXT,
    plan_type VARCHAR(50),
    duration_days INT,
    assigned_by INT,
    assigned_date DATE,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- 10. Trainers Table
CREATE TABLE trainers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    member_id INT,
    full_name VARCHAR(100),
    phone VARCHAR(15),
    email VARCHAR(100),
    specialty VARCHAR(100),
    experience_years INT,
    photo_url VARCHAR(255),
    bio TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (member_id) REFERENCES members(id)
);

-- 11. Activity Logs Table
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255),
    ip_address VARCHAR(45),
    device_info TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 12. Messages Table
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT,
    receiver_id INT,
    subject VARCHAR(255),
    message TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- 13. Report Exports Table
CREATE TABLE report_exports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    report_type VARCHAR(100),
    file_url VARCHAR(255),
    export_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
