import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
const root = path.dirname(fileURLToPath(import.meta.url));
const dbName = process.env.DB_NAME || 'verdant_nursery';
const admin = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || ''
});
await admin.query('CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', [dbName]);
await admin.end();
const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: dbName, multipleStatements: true
});
await conn.query(await fs.readFile(path.join(root, 'schema.sql'), 'utf8'));
const categories = ['Flower Plants', 'Decorative Plants', 'Indoor Plants', 'Outdoor Plants', 'Small Trees', 'Fruit Plants', 'Vegetable Plants', 'Herbal Plants', 'Seasonal Plants', 'Other'];
for (let i = 0; i < categories.length; i++) {
    const name = categories[i], slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
    await conn.query('INSERT IGNORE INTO categories(name,slug,sort_order) VALUES(?,?,?)', [name, slug, i + 1]);
}
const settings = {
    nursery_name: 'Verdant Home Nursery', hero_heading: 'Bring home a little more green.', hero_description: 'Thoughtfully grown plants for calm corners, sunny balconies, and joyful gardens.', hero_primary_cta: 'Explore plants', hero_secondary_cta: 'How we grow', announcement: 'Fresh plants are added regularly — explore the collection.', about_text: 'A warm, home-grown nursery space. Update this introduction from the Owner Portal to share your own story.', phone: '', email: '', address: '', business_hours: '', whatsapp_number: '', social_links: '{}', currency: 'INR'
};
for (const [key, value] of Object.entries(settings))
    await conn.query('INSERT INTO site_settings(setting_key,setting_value) VALUES(?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)', [key, value]);
await conn.query("INSERT IGNORE INTO delivery_settings(id,delivery_enabled,pickup_enabled,free_delivery_threshold,estimated_text,instructions) VALUES(1,1,1,1000,'Usually ready in 1–3 days','Plants are packed with care. Pickup time is confirmed after ordering.')");
const ownerEmail = process.env.OWNER_EMAIL || 'owner@local.test';
const ownerHash = await bcrypt.hash(process.env.OWNER_PASSWORD || 'ChangeThisOwnerPassword123!', 12);
await conn.query("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'owner') ON DUPLICATE KEY UPDATE name=VALUES(name)", [process.env.OWNER_NAME || 'Nursery Owner', ownerEmail, ownerHash]);
const plants = [['Rose Plant', 'Flower Plants', 180, 'Classic flowering plant for bright outdoor spaces.'], ['Hibiscus', 'Flower Plants', 220, 'Colourful blooms for a sunny balcony or garden.'], ['Jasmine', 'Flower Plants', 160, 'Fragrant flowering climber with delicate blooms.'], ['Bougainvillea', 'Flower Plants', 240, 'Vibrant, sun-loving garden colour.'], ['Areca Palm', 'Decorative Plants', 350, 'Graceful palm that brightens living spaces.'], ['Snake Plant', 'Indoor Plants', 280, 'A resilient, low-maintenance indoor favourite.'], ['Monstera', 'Indoor Plants', 520, 'Statement foliage for bright, indirect light.'], ['Peace Lily', 'Indoor Plants', 320, 'Elegant green leaves and calming white flowers.'], ['Money Plant', 'Indoor Plants', 150, 'Easy-growing trailing plant for homes.'], ['Rubber Plant', 'Indoor Plants', 390, 'Glossy, dramatic foliage for a modern corner.'], ['Croton', 'Decorative Plants', 250, 'Bold, colourful foliage with character.'], ['Spider Plant', 'Indoor Plants', 140, 'Friendly, easy-care plant for shelves and hanging pots.'], ['Aloe Vera', 'Herbal Plants', 130, 'Useful succulent with simple care needs.'], ['Tulsi', 'Herbal Plants', 90, 'A cherished aromatic herb for a sunny spot.'], ['Mint', 'Herbal Plants', 80, 'Fresh culinary herb that grows quickly.'], ['Curry Leaf Plant', 'Herbal Plants', 190, 'A practical, aromatic kitchen-garden plant.'], ['Lemon Sapling', 'Fruit Plants', 420, 'Young citrus plant for a sunny garden.'], ['Mango Sapling', 'Fruit Plants', 480, 'A young fruit sapling for long-term growing.'], ['Guava Sapling', 'Fruit Plants', 320, 'Popular fruit plant for warm outdoor spaces.'], ['Tomato Plant', 'Vegetable Plants', 70, 'Seasonal vegetable starter for a sunny balcony.'], ['Chilli Plant', 'Vegetable Plants', 75, 'Compact edible plant with bright chillies.'], ['Brinjal Plant', 'Vegetable Plants', 85, 'Healthy vegetable starter for kitchen gardens.'], ['Neem Tree', 'Small Trees', 260, 'Young native tree for an outdoor growing space.'], ['Marigold', 'Seasonal Plants', 65, 'Cheerful seasonal flowers for sunny beds.']];
for (let i = 0; i < plants.length; i++) {
    const [name, category, price, desc] = plants[i];
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
    const [[c]] = await conn.query('SELECT id FROM categories WHERE name=?', [category]);
    await conn.query("INSERT IGNORE INTO plants(category_id,name,slug,price,short_description,description,stock,low_stock_threshold,status,featured,plant_type,sunlight,water,care_instructions) VALUES(?,?,?,?,?,?,?,5,'published',?,?,?,'Water when the top soil begins to dry. Keep in a suitable place and watch it thrive.')", [c.id, name, slug, price, desc, desc, 8 + (i % 17), i < 8 ? 'Featured nursery plant' : 'Plant', i % 3 === 0 ? 'Full sun' : 'Bright indirect light', i % 3 === 0 ? 'Regular' : 'Moderate']);
    const [[p]] = await conn.query('SELECT id FROM plants WHERE slug=?', [slug]);
    await conn.query("INSERT IGNORE INTO plant_images(plant_id,path,alt_text,is_primary,sort_order) VALUES(?, '/seed/plant-placeholder.svg', ?, 1, 1)", [p.id, name]);
}
const faq = [['How are plants packed?', 'Each order is prepared carefully for local collection or delivery.'], ['Can I ask about plant care?', 'Yes. Use the WhatsApp enquiry link on a plant page after the owner adds a WhatsApp number.'], ['Can I choose pickup?', 'Pickup availability and instructions are shown at checkout.']];
for (let i = 0; i < faq.length; i++)
    await conn.query('INSERT INTO faqs(question,answer,sort_order) VALUES(?,?,?) ON DUPLICATE KEY UPDATE answer=VALUES(answer)', [faq[i][0], faq[i][1], i + 1]);
await conn.end();
console.log(`Ready: MySQL database ${dbName} has been created and seeded.`);
