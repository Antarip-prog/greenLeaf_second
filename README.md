# Verdant Home Nursery

Local-first plant nursery shop for Windows. It has a public customer shop and a private owner portal, powered by React, Express, and MySQL.

## Fast start (after installing Node.js and XAMPP MySQL)

1. Copy `backend/.env.example` to `backend/.env` and set the MySQL password used by XAMPP (usually blank by default).
2. Open **two** PowerShell windows in this project folder.
3. In the first: `cd backend`, then `npm install`, then `npm run setup`, then `npm run dev`.
4. In the second: `cd frontend`, then `npm install`, then `npm run dev`.
5. Open the address Vite prints (normally `http://localhost:5173`). The owner portal is `http://localhost:5173/owner`.

The setup command creates the database, tables, categories, FAQ, website settings, 24 sample plants, and an owner account from the `.env` values. Change the initial owner password immediately from the owner portal.

Read [docs/OWNER-GUIDE.md](docs/OWNER-GUIDE.md) for the complete beginner guide, backup instructions, troubleshooting, and deployment notes.
