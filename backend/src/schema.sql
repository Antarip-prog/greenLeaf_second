CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer','owner') NOT NULL DEFAULT 'customer',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  image_url VARCHAR(500),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS plants (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  short_description VARCHAR(300) NOT NULL,
  description TEXT,
  botanical_name VARCHAR(180),
  plant_type VARCHAR(100),
  sunlight VARCHAR(100),
  water VARCHAR(100),
  soil VARCHAR(150),
  suitable_location VARCHAR(150),
  height VARCHAR(100),
  care_instructions TEXT,
  seasonal_info VARCHAR(150),
  stock INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  status ENUM('published','hidden','draft','unavailable','archived') NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_plants_category FOREIGN KEY(category_id) REFERENCES categories(id),
  INDEX idx_plants_catalog(status, category_id, featured),
  FULLTEXT INDEX ft_plants(name, short_description, description, botanical_name)
);
CREATE TABLE IF NOT EXISTS plant_images (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  plant_id BIGINT UNSIGNED NOT NULL,
  path VARCHAR(500) NOT NULL,
  alt_text VARCHAR(200),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_image_plant FOREIGN KEY(plant_id) REFERENCES plants(id) ON DELETE CASCADE,
  INDEX idx_images_plant(plant_id, is_primary)
);
CREATE TABLE IF NOT EXISTS wishlists (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wishlist_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS wishlist_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  wishlist_id BIGINT UNSIGNED NOT NULL,
  plant_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_wishlist_plant(wishlist_id,plant_id),
  CONSTRAINT fk_wi_list FOREIGN KEY(wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE,
  CONSTRAINT fk_wi_plant FOREIGN KEY(plant_id) REFERENCES plants(id)
);
CREATE TABLE IF NOT EXISTS carts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS cart_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  cart_id BIGINT UNSIGNED NOT NULL,
  plant_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  UNIQUE KEY unique_cart_plant(cart_id,plant_id),
  CONSTRAINT fk_ci_cart FOREIGN KEY(cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_plant FOREIGN KEY(plant_id) REFERENCES plants(id)
);
CREATE TABLE IF NOT EXISTS addresses (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  label ENUM('Home','Work','Other') NOT NULL DEFAULT 'Home',
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address_line TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pin_code VARCHAR(12) NOT NULL,
  landmark VARCHAR(200),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_address_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_address_user(user_id)
);
CREATE TABLE IF NOT EXISTS delivery_zones (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  pin_codes TEXT NOT NULL,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS delivery_settings (
  id TINYINT PRIMARY KEY DEFAULT 1,
  delivery_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  pickup_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  free_delivery_threshold DECIMAL(10,2) DEFAULT 1000,
  estimated_text VARCHAR(200) DEFAULT 'Usually ready in 1–3 days',
  instructions TEXT,
  CHECK(id=1)
);
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_number VARCHAR(32) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL,
  address_id BIGINT UNSIGNED NULL,
  shipping_name VARCHAR(120) NOT NULL,
  shipping_phone VARCHAR(30) NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city VARCHAR(100) NOT NULL,
  shipping_state VARCHAR(100) NOT NULL,
  shipping_pin_code VARCHAR(12) NOT NULL,
  shipping_landmark VARCHAR(200),
  delivery_method ENUM('delivery','pickup') NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_method ENUM('cod','upi') NOT NULL,
  payment_status ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  payment_reference VARCHAR(100),
  status ENUM('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled') NOT NULL DEFAULT 'pending',
  customer_notes TEXT,
  internal_notes TEXT,
  cancellation_requested BOOLEAN NOT NULL DEFAULT FALSE,
  inventory_restored BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_user FOREIGN KEY(user_id) REFERENCES users(id),
  INDEX idx_orders_user(user_id,created_at),
  INDEX idx_orders_status(status)
);
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT UNSIGNED NOT NULL,
  plant_id BIGINT UNSIGNED NULL,
  product_name VARCHAR(180) NOT NULL,
  product_image VARCHAR(500),
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_oi_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_oi_order(order_id)
);
CREATE TABLE IF NOT EXISTS faqs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  question VARCHAR(300) NOT NULL,
  answer TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS inventory_history (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  plant_id BIGINT UNSIGNED NOT NULL,
  change_amount INT NOT NULL,
  reason VARCHAR(200) NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ih_plant FOREIGN KEY(plant_id) REFERENCES plants(id),
  CONSTRAINT fk_ih_order FOREIGN KEY(order_id) REFERENCES orders(id),
  CONSTRAINT fk_ih_user FOREIGN KEY(user_id) REFERENCES users(id),
  INDEX idx_ih_plant(plant_id,created_at)
);
