CREATE TABLE users (
    user_id BIGINT AUTO_INCREMENT PRIMARY KEY,

    tenant_id BIGINT NULL,
    -- NULL for Super Admin
    -- NOT NULL for Admin, Supervisor, Driver

    role ENUM('superadmin','admin','supervisor','user') NOT NULL,

    username VARCHAR(100) NOT NULL UNIQUE,
    -- Used for login and identification

    full_name VARCHAR(100) NOT NULL,

    email VARCHAR(150) NOT NULL UNIQUE,

    phone_number VARCHAR(20) NOT NULL,

    password VARCHAR(255) NOT NULL,

    status ENUM(
        'ACTIVE',
        'INACTIVE',
        'SUSPENDED'
    ) DEFAULT 'ACTIVE',

    is_external_driver BOOLEAN DEFAULT FALSE,
    -- TRUE for third-party delivery agents

    license_number VARCHAR(50) NULL,
    -- Only applicable for drivers

    vehicle_type VARCHAR(50) NULL,
    -- Bike, Van, Truck, etc.

    vehicle_number VARCHAR(50) NULL,

    last_login DATETIME NULL,

    created_by BIGINT NULL,
    -- Who created this user (Admin or Super Admin)

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

INSERT INTO users (
    tenant_id,
    role,
    username,
    full_name,
    email,
    phone_number,
    password,
    status,
    is_external_driver,
    created_by
) VALUES (
    NULL,
    'superadmin',
    'AS',
    'Yogesh Kumar S',
    '1@gmail.com',
    '9080901518',
    'Admin@123',
    'ACTIVE',
    FALSE,
    NULL
);
INSERT INTO users (
    tenant_id,
    role,
    username,
    full_name,
    email,
    phone_number,
    password,
    status,
    is_external_driver,
    created_by
) VALUES (
    1,
    'admin',
    'Admin',
    'Saravanakumar',
    '2@gmail.com',
    '9659650791',
    'Admin@123',
    'ACTIVE',
    FALSE,
    1
);
INSERT INTO users (
    tenant_id,
    role,
    username,
    full_name,
    email,
    phone_number,
    password,
    status,
    is_external_driver,
    created_by
) VALUES (
    1,
    'supervisor',
    'Supervisor',
    'Radha',
    '3@gmail.com',
    '9600313884',
    'Admin@123',
    'ACTIVE',
    FALSE,
    2
);
INSERT INTO users (
    tenant_id,
    role,
    username,
    full_name,
    email,
    phone_number,
    password,
    status,
    is_external_driver,
    license_number,
    vehicle_type,
    vehicle_number,
    created_by
) VALUES (
    1,
    'user',
    'Driver',
    'Ramesh Kumar',
    '4@gmail.com',
    '9543271427',
    'Admin@123',
    'ACTIVE',
    FALSE,
    'DL-IND-123456',
    'Bike',
    'TN09AB1234',
    3
);


