# Verdant Home Nursery — simple local guide

## What this application is

This is a complete local business application: customers use the shop at `http://localhost:5173`; the private control centre is at `http://localhost:5173/owner`. The browser screens are the **frontend**. The small behind-the-scenes service is the **backend**. MySQL is the database: it is where your plants, customers, prices, orders, settings, and stock are kept safely after a restart.

## Install it on a Windows laptop

1. Install the current **Node.js LTS** from [nodejs.org](https://nodejs.org). Node.js runs the two local parts of this website. During setup, leave “npm package manager” selected. Open a *new* PowerShell and check `node --version` and `npm --version` both work.
2. Install [XAMPP](https://www.apachefriends.org/) for Windows. XAMPP is an easy local bundle that includes MySQL. Open **XAMPP Control Panel**, click **Start** beside **MySQL**, and wait for its row to turn green. Apache is not needed for this project.
3. Put the `my_app` folder somewhere permanent, for example `C:\Users\YourName\Desktop\my_app`.
4. In File Explorer, open `backend`. Copy `.env.example`, rename the copy to `.env`, and open `.env` in Notepad. Leave `DB_PASSWORD=` blank if this is a standard fresh XAMPP installation. Change `JWT_SECRET` to a long private sentence. Choose an `OWNER_EMAIL` and a strong `OWNER_PASSWORD`. Never share this file or password.
5. Open PowerShell in the project folder. Run:

   ```powershell
   cd backend
   npm install
   npm run setup
   npm run dev
   ```

   `npm install` downloads the required program packages. `npm run setup` creates the MySQL database, all tables, 24 sample plants, starter content, and the owner account. You do not write SQL yourself.
6. Open a second PowerShell in the project folder and run:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

7. Open `http://localhost:5173` in your browser. Open `http://localhost:5173/owner` and sign in with the owner email/password from `backend/.env`.

Keep both PowerShell windows open while using the site. To stop the application, press `Ctrl+C` in each window. Start MySQL, the backend, and the frontend again next time.

## Owner Portal routine

- **Dashboard:** shows current plant, stock, order, and customer totals.
- **Catalog:** choose **Add plant**, complete the form, choose Published to show it to customers, optionally check Featured, and save. Edit an existing plant to change its price, descriptions, stock level, visibility, or care data. Archive removes it from the live shop but keeps historic order information correct.
- **Images:** while adding/editing a plant, select JPG, PNG, or WebP images (maximum 5 MB each). The server gives uploaded files safe names. Existing image API controls also support primary-image selection and deletion; these are intentionally protected owner-only operations.
- **Categories:** add categories, control their visibility/order, and delete only unused categories. Customer filters update from this data.
- **Inventory:** use **Adjust stock**. Enter a positive number for stock-in and a negative number for stock-out. The activity list records why stock changed. Low stock and out-of-stock are calculated from each plant’s own threshold.
- **Orders:** change status through Pending → Confirmed → Preparing → Ready → Out for Delivery → Delivered. A customer cancellation request is highlighted. Change it to Cancelled once to restore stock; the server records that restoration and cannot restore it twice. Owner notes are never sent to customers.
- **Customers:** displays contact, join date, number of orders, and order value. Passwords are never visible or stored in readable form.
- **Website content:** change nursery name, hero wording, about text, contact details, hours, and WhatsApp number. Save once; public pages retrieve the new values from MySQL.
- **FAQ:** add, edit, and remove customer-facing questions.
- **Delivery:** turn delivery/pickup on or off, choose free-delivery threshold and instructions, then add exact PIN-code zones and charges. Leave zones empty to allow local delivery generally; once zones exist, only listed PIN codes can check out.

Change your initial password after the first login from **My account → Profile** (customer accounts) or by setting a new `OWNER_PASSWORD` in `.env` and running `npm run setup` before any owner profile has been changed. For a production owner password-reset screen, add email delivery first; this local release deliberately does not pretend to email reset links.

## Customer journey

Guests can browse, search, filter, open details, add to wishlist and cart, and refresh/reopen the browser without registering. Guest choices are stored in the browser only until login; they are never trusted for price or stock. At checkout the user signs in or registers. The app sends guest cart/wishlist items to the backend, merges duplicates, limits quantity to current stock, and keeps the customer’s existing saved cart/wishlist. Checkout validates price, published status, delivery settings, and stock again in MySQL before creating an order. Customers can add addresses, review the visual order-tracking sequence, and request cancellation while pending/confirmed.

## Data and security

- Passwords use bcrypt hashing; no plaintext password is stored.
- Authentication is a signed, time-limited token. Owner API routes also verify the owner role on the server.
- MySQL prepared statements are used for data values, and the browser does not decide price, stock, totals, user ID, or permissions.
- Uploaded files are limited to JPG/JPEG, PNG, or WebP and 5 MB; files receive random safe names under `backend/uploads`.
- Order items preserve product name, image, unit price, line total, and quantity at purchase. Changing/deleting/archiving a catalog plant cannot rewrite old orders.

## Backup and restore

Backups matter because MySQL contains the business record. With MySQL running, open PowerShell and run (choose a dated path you can find):

```powershell
mysqldump -u root verdant_nursery > C:\Users\YourName\Desktop\verdant-backup-2026-09-08.sql
```

If your MySQL root account has a password, add `-p` after `root`; it will ask for the password safely. Also copy the entire `backend/uploads` folder beside the backup because it contains plant photos. To restore only when needed, start MySQL and run:

```powershell
mysql -u root verdant_nursery < C:\Users\YourName\Desktop\verdant-backup-2026-09-08.sql
```

## Troubleshooting

| Problem | Meaning and exact action |
|---|---|
| `npm is not recognized` | Node.js/npm is missing from Windows PATH. Reinstall Node.js LTS with npm selected, close PowerShell, open a new one, and run `npm --version`. |
| MySQL connection error | MySQL is not running or `.env` has wrong credentials. Open XAMPP, start MySQL, then check `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD` in `backend/.env`. |
| `Access denied` MySQL | The MySQL user/password differs from `.env`. Update the two values to match XAMPP/phpMyAdmin, then rerun `npm run setup`. |
| Port already in use | Another program has port 4000 or 5173. Stop the old PowerShell server, or change `PORT` in backend `.env`; if API port changes, update `API` in `frontend/src/main.jsx` before starting. |
| Website opens but has no plants | Check backend PowerShell is running and MySQL is green. Run `npm run setup` once in `backend`, then refresh. |
| Image upload fails | Select a JPG, JPEG, PNG, or WebP under 5 MB. Verify `backend/uploads` exists and the backend PowerShell has no error. |
| Login fails | Use the email/password in `backend/.env` for the initial owner. For customers, check the registered email and password. |
| Checkout fails | The server has found a real issue: insufficient stock, a hidden plant, a disabled method, or an unavailable PIN zone. Read the simple on-screen message, correct it in Owner Portal, then retry. |
| Owner page does not open | Go to `/owner`, use the owner account, and ensure the account’s role was created by `npm run setup`. Customer accounts cannot access it. |

## Later: publishing safely

Nothing needs to be purchased now. Before making this public, use managed production MySQL, HTTPS/domain hosting, a production `JWT_SECRET`, cloud/object image storage, regular encrypted backups, error monitoring, rate-limit/proxy configuration, an email service, WhatsApp/SMS integration if wanted, and a real Indian gateway such as Razorpay. Do not expose this local XAMPP database directly to the internet. Test the backup restore and run a security review before launch.
