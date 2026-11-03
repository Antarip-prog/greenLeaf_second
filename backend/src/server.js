import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { query, transaction } from './db.js';
import 'dotenv/config';
const app = express(), root = path.dirname(fileURLToPath(import.meta.url)), uploadDir = path.join(root, '../uploads');
fs.mkdirSync(uploadDir, {
    recursive: true
});
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));
app.use(express.json({
    limit: '1mb'
}));
app.use('/uploads', express.static(uploadDir));
app.use('/seed', express.static(path.join(root, '../public/seed')));
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, max: 300
}));
const sign = u => jwt.sign({
    id: u.id, role: u.role, name: u.name
}, process.env.JWT_SECRET || 'local-only-change-me', {
    expiresIn: '7d'
});
const auth = (roles = []) => async (req, res, next) => {
    try {
        const raw = req.headers.authorization?.replace('Bearer ', '');
        if (!raw)
            throw 0;
        const user = jwt.verify(raw, process.env.JWT_SECRET || 'local-only-change-me');
        if (roles.length && !roles.includes(user.role))
            return res.status(403).json({
                message: 'You do not have permission for that action.'
            });
        req.user = user;
        next();
    }
    catch {
        return res.status(401).json({
            message: 'Please log in to continue.'
        });
    }
};
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const slug = s => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const fail = (res, message, status = 400) => res.status(status).json({
    message
});
function publicPlantSelect(where = '') {
    return `SELECT p.*,c.name category,c.slug category_slug,(SELECT path FROM plant_images WHERE plant_id=p.id ORDER BY is_primary DESC,sort_order,id LIMIT 1) image FROM plants p JOIN categories c ON c.id=p.category_id ${where}`;
}
const storage = multer.diskStorage({
    destination: uploadDir, filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname).toLowerCase()}`)
});
const uploader = multer({
    storage, limits: {
        fileSize: 5 * 1024 * 1024, files: 8
    }, fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype))
});
const imageUpload = (req, res, next) => uploader.array('images', 8)(req, res, e => {
    if (e)
        return fail(res, e.code === 'LIMIT_FILE_SIZE' ? 'Images must be 5 MB or smaller.' : 'Use JPG, PNG, or WebP images.');
    next();
});
async function getSettings() {
    const [rows] = await query('SELECT setting_key,setting_value FROM site_settings');
    return Object.fromEntries(rows.map(x => [x.setting_key, x.setting_value]));
}
async function accountData(userId) {
    const [[user]] = await query('SELECT id,name,email,phone,role,created_at FROM users WHERE id=?', [userId]);
    return user;
}
async function wishlist(userId) {
    const [r] = await query(`SELECT p.*,c.name category,c.slug category_slug,(SELECT path FROM plant_images WHERE plant_id=p.id ORDER BY is_primary DESC,sort_order,id LIMIT 1) image FROM wishlist_items wi JOIN wishlists w ON w.id=wi.wishlist_id JOIN plants p ON p.id=wi.plant_id JOIN categories c ON c.id=p.category_id WHERE w.user_id=? ORDER BY wi.created_at DESC`, [userId]);
    return r;
}
async function cart(userId) {
    const [r] = await query(`SELECT p.*,c.name category,c.slug category_slug,ci.quantity,(SELECT path FROM plant_images WHERE plant_id=p.id ORDER BY is_primary DESC,sort_order,id LIMIT 1) image FROM cart_items ci JOIN carts ca ON ca.id=ci.cart_id JOIN plants p ON p.id=ci.plant_id JOIN categories c ON c.id=p.category_id WHERE ca.user_id=? ORDER BY ci.id DESC`, [userId]);
    return r.map(x => ({
        ...x, quantity: x.quantity || 1, line_total: Number(x.price) * x.quantity
    }));
}
async function cartId(conn, userId) {
    await conn.execute('INSERT IGNORE INTO carts(user_id) VALUES(?)', [userId]);
    const [[r]] = await conn.execute('SELECT id FROM carts WHERE user_id=?', [userId]);
    return r.id;
}
async function listOrders(userId, owner = false) {
    const where = owner ? '' : 'WHERE o.user_id=?';
    const [orders] = await query(`SELECT o.*,u.name customer_name,u.email customer_email FROM orders o JOIN users u ON u.id=o.user_id ${where} ORDER BY o.created_at DESC`, owner ? [] : [userId]);
    for (const order of orders) {
        const [items] = await query('SELECT * FROM order_items WHERE order_id=?', [order.id]);
        order.items = items;
    }
    return orders;
}
app.get('/api/health', asyncRoute(async (req, res) => {
    await query('SELECT 1');
    res.json({
        ok: true
    });
}));
app.get('/api/site', asyncRoute(async (req, res) => {
    const settings = await getSettings();
    const [categories] = await query('SELECT * FROM categories WHERE enabled=1 ORDER BY sort_order,name');
    const [faqs] = await query('SELECT * FROM faqs WHERE enabled=1 ORDER BY sort_order,id');
    const [[delivery]] = await query('SELECT * FROM delivery_settings WHERE id=1');
    res.json({
        settings, categories, faqs, delivery
    });
}));
app.get('/api/plants', asyncRoute(async (req, res) => {
    const { q = '', category = '', availability = '', featured = '', sort = 'newest', min = '', max = '', page = '1' } = req.query;
    let w = ['p.status=\'published\'', 'c.enabled=1'], v = [];
    if (q) {
        w.push('(p.name LIKE ? OR p.short_description LIKE ? OR p.description LIKE ? OR p.botanical_name LIKE ? OR c.name LIKE ?)');
        v.push(...Array(5).fill(`%${q}%`));
    }
    if (category) {
        w.push('c.slug=?');
        v.push(category);
    }
    if (availability === 'in')
        w.push('p.stock>0');
    if (availability === 'out')
        w.push('p.stock=0');
    if (featured === 'true')
        w.push('p.featured=1');
    if (min !== '') {
        w.push('p.price>=?');
        v.push(Number(min));
    }
    if (max !== '') {
        w.push('p.price<=?');
        v.push(Number(max));
    }
    const orders = {
        price_asc: 'p.price ASC', price_desc: 'p.price DESC', name: 'p.name ASC', newest: 'p.created_at DESC'
    };
    const limit = 24, offset = (Math.max(1, Number(page)) - 1) * limit;
    const where = 'WHERE ' + w.join(' AND ');
    const [[count]] = await query(`SELECT COUNT(*) total FROM plants p JOIN categories c ON c.id=p.category_id ${where}`, v);
    const [plants] = await query(`${publicPlantSelect(where)} ORDER BY ${orders[sort] || orders.newest} LIMIT ? OFFSET ?`, [...v, limit, offset]);
    res.json({
        plants, total: count.total, page: Number(page), pages: Math.ceil(count.total / limit)
    });
}));
app.get('/api/plants/:id', asyncRoute(async (req, res) => {
    const [[p]] = await query(publicPlantSelect('WHERE p.id=? AND p.status=\'published\''), [req.params.id]);
    if (!p)
        return fail(res, 'Plant not found.', 404);
    const [images] = await query('SELECT * FROM plant_images WHERE plant_id=? ORDER BY is_primary DESC,sort_order,id', [p.id]);
    res.json({
        ...p, images
    });
}));
app.post('/api/auth/register', asyncRoute(async (req, res) => {
    const body = z.object({
        name: z.string().min(2).max(120), email: z.string().email(), phone: z.string().min(6).max(30), password: z.string().min(8).max(100)
    }).safeParse(req.body);
    if (!body.success)
        return fail(res, 'Please enter a valid name, email, phone number, and password (at least 8 characters).');
    const [old] = await query('SELECT id FROM users WHERE email=?', [body.data.email.toLowerCase()]);
    if (old.length)
        return fail(res, 'An account already uses this email.');
    const hash = await bcrypt.hash(body.data.password, 12);
    const [r] = await query("INSERT INTO users(name,email,phone,password_hash,role) VALUES(?,?,?,?, 'customer')", [body.data.name, body.data.email.toLowerCase(), body.data.phone, hash]);
    const user = {
        id: r.insertId, name: body.data.name, role: 'customer'
    };
    res.status(201).json({
        token: sign(user), user: await accountData(user.id)
    });
}));
app.post('/api/auth/login', asyncRoute(async (req, res) => {
    const body = z.object({
        email: z.string().email(), password: z.string().min(1)
    }).safeParse(req.body);
    if (!body.success)
        return fail(res, 'Enter your email and password.');
    const [[u]] = await query('SELECT * FROM users WHERE email=?', [body.data.email.toLowerCase()]);
    if (!u || !u.active || !(await bcrypt.compare(body.data.password, u.password_hash)))
        return fail(res, 'Email or password is incorrect.', 401);
    res.json({
        token: sign(u), user: await accountData(u.id)
    });
}));
app.get('/api/me', auth(), asyncRoute(async (req, res) => res.json(await accountData(req.user.id))));
app.put('/api/me', auth(), asyncRoute(async (req, res) => {
    const b = z.object({
        name: z.string().min(2).max(120), phone: z.string().max(30).optional()
    }).safeParse(req.body);
    if (!b.success)
        return fail(res, 'Please enter a valid name.');
    await query('UPDATE users SET name=?,phone=? WHERE id=?', [b.data.name, b.data.phone || null, req.user.id]);
    res.json(await accountData(req.user.id));
}));
app.put('/api/me/password', auth(), asyncRoute(async (req, res) => {
    const b = z.object({
        currentPassword: z.string(), newPassword: z.string().min(8)
    }).safeParse(req.body);
    if (!b.success)
        return fail(res, 'Your new password must have at least 8 characters.');
    const [[u]] = await query('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
    if (!(await bcrypt.compare(b.data.currentPassword, u.password_hash)))
        return fail(res, 'Your current password is incorrect.');
    await query('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(b.data.newPassword, 12), req.user.id]);
    res.json({
        message: 'Password changed.'
    });
}));
app.get('/api/wishlist', auth(), asyncRoute(async (req, res) => res.json(await wishlist(req.user.id))));
app.post('/api/wishlist/:plantId', auth(), asyncRoute(async (req, res) => {
    const [[p]] = await query('SELECT id FROM plants WHERE id=?', [req.params.plantId]);
    if (!p)
        return fail(res, 'Plant not found.', 404);
    await query('INSERT IGNORE INTO wishlists(user_id) VALUES(?)', [req.user.id]);
    await query('INSERT IGNORE INTO wishlist_items(wishlist_id,plant_id) VALUES((SELECT id FROM wishlists WHERE user_id=?),?)', [req.user.id, p.id]);
    res.json(await wishlist(req.user.id));
}));
app.delete('/api/wishlist/:plantId', auth(), asyncRoute(async (req, res) => {
    await query('DELETE wi FROM wishlist_items wi JOIN wishlists w ON w.id=wi.wishlist_id WHERE w.user_id=? AND wi.plant_id=?', [req.user.id, req.params.plantId]);
    res.json(await wishlist(req.user.id));
}));
app.post('/api/sync-guest', auth(), asyncRoute(async (req, res) => {
    const b = z.object({
        cart: z.array(z.object({
            plantId: z.coerce.number().int().positive(), quantity: z.coerce.number().int().positive()
        })).max(100).default([]), wishlist: z.array(z.coerce.number().int().positive()).max(100).default([])
    }).safeParse(req.body);
    if (!b.success)
        return fail(res, 'Invalid saved basket data.');
    const notices = [];
    await transaction(async (c) => {
        const cid = await cartId(c, req.user.id);
        for (const item of b.data.cart) {
            const [[p]] = await c.execute("SELECT id,stock,status FROM plants WHERE id=? FOR UPDATE", [item.plantId]);
            if (!p || p.status !== 'published' || p.stock < 1)
                continue;
            const [[existing]] = await c.execute('SELECT quantity FROM cart_items WHERE cart_id=? AND plant_id=?', [cid, p.id]);
            const desired = Math.min(p.stock, (existing?.quantity || 0) + item.quantity);
            if (desired < (existing?.quantity || 0) + item.quantity)
                notices.push(`${p.id}: cart quantity limited to current stock.`);
            await c.execute('INSERT INTO cart_items(cart_id,plant_id,quantity) VALUES(?,?,?) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity)', [cid, p.id, desired]);
        }
        await c.execute('INSERT IGNORE INTO wishlists(user_id) VALUES(?)', [req.user.id]);
        for (const pid of b.data.wishlist)
            await c.execute('INSERT IGNORE INTO wishlist_items(wishlist_id,plant_id) VALUES((SELECT id FROM wishlists WHERE user_id=?),?)', [req.user.id, pid]);
    });
    res.json({
        cart: await cart(req.user.id), wishlist: await wishlist(req.user.id), notices
    });
}));
app.get('/api/cart', auth(), asyncRoute(async (req, res) => res.json(await cart(req.user.id))));
app.post('/api/cart/:plantId', auth(), asyncRoute(async (req, res) => {
    const qty = Math.max(1, Number(req.body.quantity || 1));
    await transaction(async (c) => {
        const [[p]] = await c.execute("SELECT * FROM plants WHERE id=? FOR UPDATE", [req.params.plantId]);
        if (!p || p.status !== 'published' || p.stock < 1)
            throw new Error('This plant is currently unavailable.');
        const cid = await cartId(c, req.user.id);
        const [[old]] = await c.execute('SELECT quantity FROM cart_items WHERE cart_id=? AND plant_id=?', [cid, p.id]);
        const amount = Math.min(p.stock, (old?.quantity || 0) + qty);
        await c.execute('INSERT INTO cart_items(cart_id,plant_id,quantity) VALUES(?,?,?) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity)', [cid, p.id, amount]);
    });
    res.json(await cart(req.user.id));
}));
app.put('/api/cart/:plantId', auth(), asyncRoute(async (req, res) => {
    const qty = Number(req.body.quantity);
    if (!Number.isInteger(qty) || qty < 0)
        return fail(res, 'Quantity is invalid.');
    await transaction(async (c) => {
        const cid = await cartId(c, req.user.id);
        if (!qty)
            return c.execute('DELETE FROM cart_items WHERE cart_id=? AND plant_id=?', [cid, req.params.plantId]);
        const [[p]] = await c.execute('SELECT stock,status FROM plants WHERE id=? FOR UPDATE', [req.params.plantId]);
        if (!p || p.status !== 'published' || !p.stock)
            throw new Error('This plant is unavailable.');
        await c.execute('UPDATE cart_items SET quantity=? WHERE cart_id=? AND plant_id=?', [Math.min(qty, p.stock), cid, req.params.plantId]);
    });
    res.json(await cart(req.user.id));
}));
app.delete('/api/cart/:plantId', auth(), asyncRoute(async (req, res) => {
    await query('DELETE ci FROM cart_items ci JOIN carts c ON c.id=ci.cart_id WHERE c.user_id=? AND ci.plant_id=?', [req.user.id, req.params.plantId]);
    res.json(await cart(req.user.id));
}));
app.get('/api/addresses', auth(), asyncRoute(async (req, res) => {
    const [r] = await query('SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC,id DESC', [req.user.id]);
    res.json(r);
}));
app.post('/api/addresses', auth(), asyncRoute(async (req, res) => {
    const b = z.object({
        label: z.enum(['Home', 'Work', 'Other']).default('Home'), full_name: z.string().min(2), phone: z.string().min(6), address_line: z.string().min(5), city: z.string().min(2), state: z.string().min(2), pin_code: z.string().min(3), landmark: z.string().optional(), is_default: z.boolean().optional()
    }).safeParse(req.body);
    if (!b.success)
        return fail(res, 'Please complete the address fields.');
    await transaction(async (c) => {
        if (b.data.is_default)
            await c.execute('UPDATE addresses SET is_default=0 WHERE user_id=?', [req.user.id]);
        await c.execute('INSERT INTO addresses(user_id,label,full_name,phone,address_line,city,state,pin_code,landmark,is_default) VALUES(?,?,?,?,?,?,?,?,?,?)', [req.user.id, b.data.label, b.data.full_name, b.data.phone, b.data.address_line, b.data.city, b.data.state, b.data.pin_code, b.data.landmark || null, b.data.is_default ?? false]);
    });
    res.status(201).json({
        message: 'Address saved.'
    });
}));
app.put('/api/addresses/:id', auth(), asyncRoute(async (req, res) => {
    const b = req.body;
    await transaction(async (c) => {
        if (b.is_default)
            await c.execute('UPDATE addresses SET is_default=0 WHERE user_id=?', [req.user.id]);
        const [r] = await c.execute('UPDATE addresses SET label=?,full_name=?,phone=?,address_line=?,city=?,state=?,pin_code=?,landmark=?,is_default=? WHERE id=? AND user_id=?', [b.label, b.full_name, b.phone, b.address_line, b.city, b.state, b.pin_code, b.landmark || null, !!b.is_default, req.params.id, req.user.id]);
        if (!r.affectedRows)
            throw new Error('Address not found.');
    });
    res.json({
        message: 'Address updated.'
    });
}));
app.delete('/api/addresses/:id', auth(), asyncRoute(async (req, res) => {
    await query('DELETE FROM addresses WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    res.json({
        message: 'Address deleted.'
    });
}));
app.get('/api/checkout-info', auth(), asyncRoute(async (req, res) => {
    const [[delivery]] = await query('SELECT * FROM delivery_settings WHERE id=1');
    const [zones] = await query('SELECT * FROM delivery_zones WHERE enabled=1');
    res.json({
        cart: await cart(req.user.id), delivery, zones
    });
}));
app.post('/api/orders', auth(['customer']), asyncRoute(async (req, res) => {
    const b = z.object({
        addressId: z.coerce.number().int().positive().optional(), shipping: z.object({
            full_name: z.string().min(2), phone: z.string().min(6), address_line: z.string().min(5), city: z.string().min(2), state: z.string().min(2), pin_code: z.string().min(3), landmark: z.string().optional()
        }).optional(), deliveryMethod: z.enum(['delivery', 'pickup']), paymentMethod: z.enum(['cod', 'upi']), paymentReference: z.string().max(100).optional(), notes: z.string().max(1000).optional()
    }).safeParse(req.body);
    if (!b.success)
        return fail(res, 'Please complete valid checkout information.');
    const order = await transaction(async (c) => {
        const [items] = await c.execute('SELECT ci.plant_id,ci.quantity,p.name,p.price,p.stock,p.status,(SELECT path FROM plant_images WHERE plant_id=p.id ORDER BY is_primary DESC LIMIT 1) image FROM cart_items ci JOIN carts ca ON ca.id=ci.cart_id JOIN plants p ON p.id=ci.plant_id WHERE ca.user_id=? FOR UPDATE', [req.user.id]);
        if (!items.length)
            throw new Error('Your cart is empty.');
        const [[setting]] = await c.execute('SELECT * FROM delivery_settings WHERE id=1');
        if (b.data.deliveryMethod === 'delivery' && !setting.delivery_enabled)
            throw new Error('Delivery is not currently available.');
        if (b.data.deliveryMethod === 'pickup' && !setting.pickup_enabled)
            throw new Error('Pickup is not currently available.');
        let shipping = b.data.shipping;
        if (b.data.addressId) {
            const [[a]] = await c.execute('SELECT * FROM addresses WHERE id=? AND user_id=?', [b.data.addressId, req.user.id]);
            if (!a)
                throw new Error('Selected address was not found.');
            shipping = {
                full_name: a.full_name, phone: a.phone, address_line: a.address_line, city: a.city, state: a.state, pin_code: a.pin_code, landmark: a.landmark
            };
        }
        if (!shipping)
            throw new Error('Please choose or enter a delivery address.');
        let subtotal = 0;
        for (const x of items) {
            if (x.status !== 'published' || x.stock < x.quantity)
                throw new Error(`${x.name} no longer has enough stock.`);
            subtotal += Number(x.price) * x.quantity;
        }
        let fee = 0;
        if (b.data.deliveryMethod === 'delivery') {
            const [zones] = await c.execute('SELECT * FROM delivery_zones WHERE enabled=1');
            const zone = zones.find(z => z.pin_codes.split(',').map(x => x.trim()).includes(shipping.pin_code));
            if (zones.length && !zone)
                throw new Error('Delivery is not available for this PIN code.');
            fee = zone ? Number(zone.fee) : 0;
            if (setting.free_delivery_threshold && subtotal >= Number(setting.free_delivery_threshold))
                fee = 0;
        }
        const number = `VN-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        const [insert] = await c.execute('INSERT INTO orders(order_number,user_id,address_id,shipping_name,shipping_phone,shipping_address,shipping_city,shipping_state,shipping_pin_code,shipping_landmark,delivery_method,delivery_fee,subtotal,total,payment_method,payment_reference,customer_notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [number, req.user.id, b.data.addressId || null, shipping.full_name, shipping.phone, shipping.address_line, shipping.city, shipping.state, shipping.pin_code, shipping.landmark || null, b.data.deliveryMethod, fee, subtotal, subtotal + fee, b.data.paymentMethod, b.data.paymentReference || null, b.data.notes || null]);
        for (const x of items) {
            await c.execute('INSERT INTO order_items(order_id,plant_id,product_name,product_image,unit_price,quantity,line_total) VALUES(?,?,?,?,?,?,?)', [insert.insertId, x.plant_id, x.name, x.image, x.price, x.quantity, Number(x.price) * x.quantity]);
            await c.execute('UPDATE plants SET stock=stock-? WHERE id=?', [x.quantity, x.plant_id]);
            await c.execute('INSERT INTO inventory_history(plant_id,change_amount,reason,order_id,user_id) VALUES(?,?,?,?,?)', [x.plant_id, -x.quantity, `Order ${number}`, insert.insertId, req.user.id]);
        }
        await c.execute('DELETE ci FROM cart_items ci JOIN carts ca ON ca.id=ci.cart_id WHERE ca.user_id=?', [req.user.id]);
        return {
            id: insert.insertId, order_number: number, total: subtotal + fee
        };
    });
    res.status(201).json({
        message: 'Your order has been placed.', order
    });
}));
app.get('/api/orders', auth(), asyncRoute(async (req, res) => res.json(await listOrders(req.user.id))));
app.post('/api/orders/:id/cancel-request', auth(['customer']), asyncRoute(async (req, res) => {
    const [r] = await query("UPDATE orders SET cancellation_requested=1 WHERE id=? AND user_id=? AND status IN ('pending','confirmed')", [req.params.id, req.user.id]);
    if (!r.affectedRows)
        return fail(res, 'This order can no longer be cancelled online.');
    res.json({
        message: 'Cancellation request sent to the nursery.'
    });
}));
// Owner portal: dashboard, catalog, categories, images, inventory, orders, customer, content, FAQ, delivery.
app.get('/api/admin/dashboard', auth(['owner']), asyncRoute(async (req, res) => {
    const [[counts]] = await query("SELECT (SELECT COUNT(*) FROM plants WHERE status!='archived') plants,(SELECT COUNT(*) FROM plants WHERE status='published') published,(SELECT COUNT(*) FROM plants WHERE status='hidden') hidden,(SELECT COUNT(*) FROM plants WHERE stock=0 AND status!='archived') out_of_stock,(SELECT COUNT(*) FROM plants WHERE stock>0 AND stock<=low_stock_threshold AND status!='archived') low_stock,(SELECT COUNT(*) FROM categories) categories,(SELECT COUNT(*) FROM users WHERE role='customer') customers,(SELECT COUNT(*) FROM orders) orders,(SELECT COUNT(*) FROM orders WHERE status='pending') pending,(SELECT COUNT(*) FROM orders WHERE status='delivered') completed,(SELECT COUNT(*) FROM orders WHERE status='cancelled') cancelled");
    const [recentOrders] = await query('SELECT o.*,u.name customer_name FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 6');
    const [recentCustomers] = await query("SELECT id,name,email,created_at FROM users WHERE role='customer' ORDER BY created_at DESC LIMIT 6");
    res.json({
        counts, recentOrders, recentCustomers
    });
}));
app.get('/api/admin/plants', auth(['owner']), asyncRoute(async (req, res) => {
    const { q = '', status = '', category = '' } = req.query;
    let w = ['1=1'], v = [];
    if (q) {
        w.push('(p.name LIKE ? OR p.botanical_name LIKE ?)');
        v.push(`%${q}%`, `%${q}%`);
    }
    if (status) {
        w.push('p.status=?');
        v.push(status);
    }
    if (category) {
        w.push('p.category_id=?');
        v.push(category);
    }
    const [r] = await query(`${publicPlantSelect('WHERE ' + w.join(' AND '))} ORDER BY p.updated_at DESC`, v);
    res.json(r);
}));
const plantBody = z.object({
    name: z.string().min(2).max(180), category_id: z.coerce.number().int().positive(), price: z.coerce.number().positive(), short_description: z.string().min(3).max(300), description: z.string().optional(), stock: z.coerce.number().int().min(0), low_stock_threshold: z.coerce.number().int().min(0).default(5), status: z.enum(['published', 'hidden', 'draft', 'unavailable']).default('draft'), featured: z.coerce.boolean().default(false), botanical_name: z.string().optional(), plant_type: z.string().optional(), sunlight: z.string().optional(), water: z.string().optional(), soil: z.string().optional(), suitable_location: z.string().optional(), height: z.string().optional(), care_instructions: z.string().optional(), seasonal_info: z.string().optional()
});
async function savePlant(req, res, isEdit = false) {
    const b = plantBody.safeParse(req.body);
    if (!b.success)
        return fail(res, 'Please complete all required plant information.');
    const d = b.data;
    let unique = slug(d.name), n = 2;
    while (true) {
        const [[x]] = await query('SELECT id FROM plants WHERE slug=? AND id<>?', [unique, isEdit ? req.params.id : 0]);
        if (!x)
            break;
        unique = `${slug(d.name)}-${n++}`;
    }
    const fields = ['category_id', 'name', 'slug', 'price', 'short_description', 'description', 'stock', 'low_stock_threshold', 'status', 'featured', 'botanical_name', 'plant_type', 'sunlight', 'water', 'soil', 'suitable_location', 'height', 'care_instructions', 'seasonal_info'];
    const values = [d.category_id, d.name, unique, d.price, d.short_description, d.description || null, d.stock, d.low_stock_threshold, d.status, d.featured, d.botanical_name || null, d.plant_type || null, d.sunlight || null, d.water || null, d.soil || null, d.suitable_location || null, d.height || null, d.care_instructions || null, d.seasonal_info || null];
    let id;
    if (isEdit) {
        await query(`UPDATE plants SET ${fields.map(f => `${f}
    =?`).join(',')} WHERE id=?`, [...values, req.params.id]);
        id = Number(req.params.id);
    }
    else {
        const [r] = await query(`INSERT INTO plants(${fields.join(',')}) VALUES(${fields.map(() => '?').join(',')})`, values);
        id = r.insertId;
        await query('INSERT INTO inventory_history(plant_id,change_amount,reason,user_id) VALUES(?,?,?,?)', [id, d.stock, 'Initial stock', req.user.id]);
    }
    res.status(isEdit ? 200 : 201).json({
        message: isEdit ? 'Plant updated.' : 'Plant saved.', id
    });
}
app.post('/api/admin/plants', auth(['owner']), asyncRoute((req, res) => savePlant(req, res)));
app.put('/api/admin/plants/:id', auth(['owner']), asyncRoute((req, res) => savePlant(req, res, true)));
app.delete('/api/admin/plants/:id', auth(['owner']), asyncRoute(async (req, res) => {
    await query("UPDATE plants SET status='archived',featured=0 WHERE id=?", [req.params.id]);
    res.json({
        message: 'Plant archived. Historical orders are unchanged.'
    });
}));
app.post('/api/admin/plants/:id/images', auth(['owner']), imageUpload, asyncRoute(async (req, res) => {
    if (!req.files?.length)
        return fail(res, 'Choose one or more valid images.');
    const [[p]] = await query('SELECT id,name FROM plants WHERE id=?', [req.params.id]);
    if (!p)
        return fail(res, 'Plant not found.', 404);
    const [[count]] = await query('SELECT COUNT(*) count FROM plant_images WHERE plant_id=?', [p.id]);
    for (let i = 0; i < req.files.length; i++)
        await query('INSERT INTO plant_images(plant_id,path,alt_text,is_primary,sort_order) VALUES(?,?,?,?,?)', [p.id, `/uploads/${req.files[i].filename}`, p.name, count.count === 0 && i === 0, Number(count.count) + i]);
    res.json({
        message: 'Images uploaded.'
    });
}));
app.put('/api/admin/images/:id/primary', auth(['owner']), asyncRoute(async (req, res) => {
    const [[image]] = await query('SELECT plant_id FROM plant_images WHERE id=?', [req.params.id]);
    if (!image)
        return fail(res, 'Image not found.', 404);
    await transaction(async (c) => {
        await c.execute('UPDATE plant_images SET is_primary=0 WHERE plant_id=?', [image.plant_id]);
        await c.execute('UPDATE plant_images SET is_primary=1 WHERE id=?', [req.params.id]);
    });
    res.json({
        message: 'Primary image updated.'
    });
}));
app.delete('/api/admin/images/:id', auth(['owner']), asyncRoute(async (req, res) => {
    const [[image]] = await query('SELECT * FROM plant_images WHERE id=?', [req.params.id]);
    if (!image)
        return fail(res, 'Image not found.', 404);
    await query('DELETE FROM plant_images WHERE id=?', [image.id]);
    if (image.path.startsWith('/uploads/'))
        fs.unlink(path.join(uploadDir, path.basename(image.path)), () => {
        });
    res.json({
        message: 'Image deleted.'
    });
}));
app.post('/api/admin/plants/:id/stock', auth(['owner']), asyncRoute(async (req, res) => {
    const amount = Number(req.body.amount), reason = String(req.body.reason || 'Manual adjustment').slice(0, 200);
    if (!Number.isInteger(amount) || !amount)
        return fail(res, 'Enter a whole-number stock adjustment.');
    await transaction(async (c) => {
        const [[p]] = await c.execute('SELECT stock FROM plants WHERE id=? FOR UPDATE', [req.params.id]);
        if (!p)
            throw new Error('Plant not found.');
        if (p.stock + amount < 0)
            throw new Error('Stock cannot go below zero.');
        await c.execute('UPDATE plants SET stock=stock+? WHERE id=?', [amount, req.params.id]);
        await c.execute('INSERT INTO inventory_history(plant_id,change_amount,reason,user_id) VALUES(?,?,?,?)', [req.params.id, amount, reason, req.user.id]);
    });
    res.json({
        message: 'Stock updated.'
    });
}));
app.get('/api/admin/inventory', auth(['owner']), asyncRoute(async (req, res) => {
    const [plants] = await query(`${publicPlantSelect("WHERE p.status!='archived'")} ORDER BY (p.stock=0) DESC,(p.stock<=p.low_stock_threshold) DESC,p.stock ASC`);
    const [history] = await query('SELECT h.*,p.name plant_name,u.name user_name FROM inventory_history h JOIN plants p ON p.id=h.plant_id LEFT JOIN users u ON u.id=h.user_id ORDER BY h.created_at DESC LIMIT 100');
    res.json({
        plants, history
    });
}));
app.get('/api/admin/categories', auth(['owner']), asyncRoute(async (req, res) => {
    const [r] = await query('SELECT c.*,COUNT(p.id) plant_count FROM categories c LEFT JOIN plants p ON p.category_id=c.id AND p.status!=\'archived\' GROUP BY c.id ORDER BY c.sort_order,c.name');
    res.json(r);
}));
app.post('/api/admin/categories', auth(['owner']), asyncRoute(async (req, res) => {
    const b = z.object({
        name: z.string().min(2), description: z.string().optional(), enabled: z.coerce.boolean().default(true), sort_order: z.coerce.number().int().default(0)
    }).safeParse(req.body);
    if (!b.success)
        return fail(res, 'Enter a category name.');
    try {
        await query('INSERT INTO categories(name,slug,description,enabled,sort_order) VALUES(?,?,?,?,?)', [b.data.name, slug(b.data.name), b.data.description || null, b.data.enabled, b.data.sort_order]);
        res.status(201).json({
            message: 'Category added.'
        });
    }
    catch {
        return fail(res, 'A category with this name already exists.');
    }
}));
app.put('/api/admin/categories/:id', auth(['owner']), asyncRoute(async (req, res) => {
    const b = req.body;
    await query('UPDATE categories SET name=?,slug=?,description=?,enabled=?,sort_order=? WHERE id=?', [b.name, slug(b.name), b.description || null, !!b.enabled, Number(b.sort_order || 0), req.params.id]);
    res.json({
        message: 'Category updated.'
    });
}));
app.delete('/api/admin/categories/:id', auth(['owner']), asyncRoute(async (req, res) => {
    const [[used]] = await query("SELECT COUNT(*) total FROM plants WHERE category_id=? AND status!='archived'", [req.params.id]);
    if (used.total)
        return fail(res, 'Archive or move the plants in this category first.');
    await query('DELETE FROM categories WHERE id=?', [req.params.id]);
    res.json({
        message: 'Category deleted.'
    });
}));
app.get('/api/admin/orders', auth(['owner']), asyncRoute(async (req, res) => res.json(await listOrders(null, true))));
app.put('/api/admin/orders/:id', auth(['owner']), asyncRoute(async (req, res) => {
    const b = z.object({
        status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']), payment_status: z.enum(['pending', 'paid', 'failed']).optional(), internal_notes: z.string().max(2000).optional()
    }).safeParse(req.body);
    if (!b.success)
        return fail(res, 'Order update is invalid.');
    await transaction(async (c) => {
        const [[o]] = await c.execute('SELECT * FROM orders WHERE id=? FOR UPDATE', [req.params.id]);
        if (!o)
            throw new Error('Order not found.');
        if (b.data.status === 'cancelled' && !o.inventory_restored) {
            const [items] = await c.execute('SELECT * FROM order_items WHERE order_id=?', [o.id]);
            for (const item of items) {
                if (item.plant_id) {
                    await c.execute('UPDATE plants SET stock=stock+? WHERE id=?', [item.quantity, item.plant_id]);
                    await c.execute('INSERT INTO inventory_history(plant_id,change_amount,reason,order_id,user_id) VALUES(?,?,?,?,?)', [item.plant_id, item.quantity, `Cancelled ${o.order_number}`, o.id, req.user.id]);
                }
            }
            await c.execute('UPDATE orders SET inventory_restored=1 WHERE id=?', [o.id]);
        }
        await c.execute('UPDATE orders SET status=?,payment_status=?,internal_notes=? WHERE id=?', [b.data.status, b.data.payment_status || o.payment_status, b.data.internal_notes ?? o.internal_notes, o.id]);
    });
    res.json({
        message: 'Order updated.'
    });
}));
app.get('/api/admin/customers', auth(['owner']), asyncRoute(async (req, res) => {
    const [r] = await query("SELECT u.id,u.name,u.email,u.phone,u.active,u.created_at,COUNT(o.id) order_count,COALESCE(SUM(o.total),0) order_value FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE u.role='customer' GROUP BY u.id ORDER BY u.created_at DESC");
    res.json(r);
}));
app.get('/api/admin/settings', auth(['owner']), asyncRoute(async (req, res) => res.json({
    settings: await getSettings(), delivery: (await query('SELECT * FROM delivery_settings WHERE id=1'))[0][0], zones: (await query('SELECT * FROM delivery_zones ORDER BY id DESC'))[0]
})));
app.put('/api/admin/settings', auth(['owner']), asyncRoute(async (req, res) => {
    const settings = req.body.settings || {};
    for (const [key, value] of Object.entries(settings)) {
        if (!/^[a-z0-9_]+$/i.test(key))
            continue;
        await query('INSERT INTO site_settings(setting_key,setting_value) VALUES(?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)', [key, String(value)]);
    }
    if (req.body.delivery) {
        const d = req.body.delivery;
        await query('UPDATE delivery_settings SET delivery_enabled=?,pickup_enabled=?,free_delivery_threshold=?,estimated_text=?,instructions=? WHERE id=1', [!!d.delivery_enabled, !!d.pickup_enabled, Number(d.free_delivery_threshold || 0), d.estimated_text || '', d.instructions || '']);
    }
    res.json({
        message: 'Website settings saved.'
    });
}));
app.post('/api/admin/zones', auth(['owner']), asyncRoute(async (req, res) => {
    const b = req.body;
    await query('INSERT INTO delivery_zones(name,pin_codes,fee,enabled) VALUES(?,?,?,?)', [b.name, b.pin_codes, Number(b.fee || 0), !!b.enabled]);
    res.status(201).json({
        message: 'Delivery zone added.'
    });
}));
app.put('/api/admin/zones/:id', auth(['owner']), asyncRoute(async (req, res) => {
    const b = req.body;
    await query('UPDATE delivery_zones SET name=?,pin_codes=?,fee=?,enabled=? WHERE id=?', [b.name, b.pin_codes, Number(b.fee || 0), !!b.enabled, req.params.id]);
    res.json({
        message: 'Delivery zone updated.'
    });
}));
app.delete('/api/admin/zones/:id', auth(['owner']), asyncRoute(async (req, res) => {
    await query('DELETE FROM delivery_zones WHERE id=?', [req.params.id]);
    res.json({
        message: 'Delivery zone deleted.'
    });
}));
app.get('/api/admin/faqs', auth(['owner']), asyncRoute(async (req, res) => res.json((await query('SELECT * FROM faqs ORDER BY sort_order,id'))[0])));
app.post('/api/admin/faqs', auth(['owner']), asyncRoute(async (req, res) => {
    const b = req.body;
    await query('INSERT INTO faqs(question,answer,enabled,sort_order) VALUES(?,?,?,?)', [b.question, b.answer, !!b.enabled, Number(b.sort_order || 0)]);
    res.status(201).json({
        message: 'FAQ added.'
    });
}));
app.put('/api/admin/faqs/:id', auth(['owner']), asyncRoute(async (req, res) => {
    const b = req.body;
    await query('UPDATE faqs SET question=?,answer=?,enabled=?,sort_order=? WHERE id=?', [b.question, b.answer, !!b.enabled, Number(b.sort_order || 0), req.params.id]);
    res.json({
        message: 'FAQ updated.'
    });
}));
app.delete('/api/admin/faqs/:id', auth(['owner']), asyncRoute(async (req, res) => {
    await query('DELETE FROM faqs WHERE id=?', [req.params.id]);
    res.json({
        message: 'FAQ deleted.'
    });
}));
app.use((err, req, res, next) => {
    console.error(err);
    res.status(400).json({
        message: err.message || 'Something went wrong. Please try again.'
    });
});
app.listen(Number(process.env.PORT || 4000), () => console.log(`Verdant API: http://localhost:${process.env.PORT || 4000}`));
