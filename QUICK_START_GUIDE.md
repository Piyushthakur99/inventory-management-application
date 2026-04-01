# 🚀 Inventory Management System - Quick Start Guide

## ✅ Current Status
- ✅ Backend is running on http://localhost:8080
- ✅ Frontend opened in browser
- ⚠️ MongoDB needs to be installed (required for data storage)

---

## 📦 Step 1: Set up MongoDB (Choose ONE Option)

### Option A: Windows Installer (Recommended for Local Development)

1. **Download MongoDB Community Server:**
   - Visit: https://www.mongodb.com/try/download/community
   - Version: 7.0+ for Windows
   - Click "Download" (MSI package)

2. **Install:**
   - Run the downloaded `.msi` file
   - Choose "Complete" installation
   - Select "Install MongoDB as a Service" ✓
   - Click "Install"

3. **Verify Installation:**
   ```powershell
   mongod --version
   ```

4. **Start MongoDB (if not running as service):**
   ```powershell
   net start MongoDB
   ```

### Option B: MongoDB Atlas (Free Cloud Database - Easiest!)

1. **Sign up for free:**
   - Visit: https://www.mongodb.com/cloud/atlas
   - Create a free account
   - Create a free cluster (M0 Free tier)

2. **Get connection string:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

3. **Update application.properties:**
   ```properties
   # Replace this line in backend/src/main/resources/application.properties

4. **Restart the backend:**
   - Stop the current backend (Ctrl+C in terminal)
   - Run: `cd backend; mvn spring-boot:run`

### Option C: MongoDB via Docker (Fast local setup)

Run MongoDB in a container. Using a non-default port helps avoid conflicts if MongoDB is already installed locally.

```powershell
docker run -d --name inventory-mongo -p 27018:27017 mongo:7
```

Start backend with an override URI:

```powershell
cd backend
$env:SPRING_DATA_MONGODB_URI = "mongodb://localhost:27018/inventory_db"
mvn spring-boot:run
```

---

## 🧪 Step 2: Test the Application

### 2.1 Test Backend Health
Open in browser or use curl:
```
http://localhost:8080/actuator/health
```

> Note: `/actuator/health` is public (no JWT required).

### 2.2 Demo Login (recommended on a fresh DB)

On a fresh database, the backend seeds these demo users by default:

- **Admin:** `admin` / `admin123`
- **Staff:** `staff` / `staff123`

Disable demo-user seeding by setting `app.demo.seed-users=false` in `backend/src/main/resources/application.properties`.

### 2.3 Register Admin User (optional)

**Option A: Using Browser Console**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Paste and run:
```javascript
fetch('http://localhost:8080/api/auth/register', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    username: "admin",
    email: "admin@example.com",
    password: "admin123",
    fullName: "Admin User",
    roles: ["ROLE_ADMIN"]
  })
}).then(r => r.json()).then(console.log)
```

**Option B: Using PowerShell**
```powershell
$body = @{
    username = "admin"
    email = "admin@example.com"
    password = "admin123"
    fullName = "Admin User"
    roles = @("ROLE_ADMIN")
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/auth/register" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

**Option C: Using Postman**
- POST to: `http://localhost:8080/api/auth/register`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "admin123",
  "fullName": "Admin User",
  "roles": ["ROLE_ADMIN"]
}
```

### 2.4 Login to Frontend
1. Go to the frontend (should be open in browser)
2. Login with:
   - **Username:** `admin`
   - **Password:** `admin123`

---

## 🎯 Step 3: Use the Application

Once logged in, you can:
- ✅ Create and manage **Categories**
- ✅ Add **Vendors** (suppliers)
- ✅ Add **Products** with pricing and stock
- ✅ Track **Inventory** levels
- ✅ Create **Purchase Orders**
- ✅ View **Dashboard** with analytics

---

## 📈 Demand Prediction (Demo Seed + Verify)

The Demand Prediction feature uses the last **30 days** of `inventory_transactions` (OUT transactions) to calculate average daily usage and predicts the next **7 days**.

### 1) Seed demo transactions (optional, recommended for first-time verification)

From the project root:

If you have `mongosh` installed:

```powershell
mongosh --file backend/scripts/seed-demand-demo.mongosh.js
```

If you don't have `mongosh`, run it via Docker (targets your local MongoDB at port 27017):

```powershell
docker run --rm -v "${PWD}/backend/scripts:/scripts" mongo:7 mongosh "mongodb://host.docker.internal:27017/inventory_db" --file /scripts/seed-demand-demo.mongosh.js
```

This creates demo products (IDs starting with `DEMO_`) and inserts the last-30-days OUT transactions with `referenceId=DEMO_SEED`.

### 2) Verify in the dashboard

- Open `frontend/dashboard.html` (prefer Live Server)
- You should see the **Demand Prediction** section populated

### 3) Verify via API

- `GET /api/predictions/demand` (requires JWT)

If you want to test quickly from PowerShell:

```powershell
$loginBody = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
$token = (Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody).token

Invoke-RestMethod -Uri "http://localhost:8080/api/predictions/demand" -Headers @{ Authorization = "Bearer $token" }
```

---

## 🛠️ Common Commands

### Backend
```powershell
# Start backend
cd backend
mvn spring-boot:run

# Build backend
mvn clean package -DskipTests

# Run tests
mvn test
```

### MongoDB
```powershell
# Start MongoDB service
net start MongoDB

# Stop MongoDB service  
net stop MongoDB

# Connect to MongoDB shell
mongosh

# Check MongoDB status
mongosh --eval "db.version()"
```

---

## 🐛 Troubleshooting

### Backend won't start?
- **Check if port 8080 is free:** 
  ```powershell
  netstat -ano | findstr :8080
  ```
- **Kill process on port 8080:**
  ```powershell
  Stop-Process -Id [PID] -Force
  ```

### Can't connect to MongoDB?
- **Verify MongoDB is running:**
  ```powershell
  Get-Service MongoDB
  ```
- **Check connection string in application.properties**

### Frontend not working?
- **Use a local server instead of opening file directly:**
  - Install VS Code "Live Server" extension
  - Right-click `index.html` → "Open with Live Server"

### Login not working?
- **Check browser console (F12) for errors**
- **Verify JWT token in localStorage:**
  ```javascript
  console.log(localStorage.getItem('token'))
  ```

---

## 📁 Project Structure

```
Minor project2/
├── backend/                 # Spring Boot API
│   ├── src/main/java/      # Java source code
│   ├── src/main/resources/ # Configuration files
│   └── pom.xml             # Maven dependencies
│
├── frontend/               # HTML/CSS/JS client
│   ├── index.html         # Login page
│   ├── dashboard.html     # Main dashboard
│   ├── products.html      # Product management
│   ├── vendors.html       # Vendor management
│   ├── inventory.html     # Inventory tracking
│   └── purchase-orders.html
│
└── README.md              # Project documentation
```

---

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

### Vendors  
- `GET /api/vendors` - List all vendors
- `POST /api/vendors` - Create vendor
- `PUT /api/vendors/{id}` - Update vendor
- `DELETE /api/vendors/{id}` - Delete vendor

### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category

### Inventory
- `GET /api/inventory` - List all inventory
- `POST /api/inventory/adjust` - Adjust stock levels

### Purchase Orders
- `GET /api/purchase-orders` - List all orders
- `POST /api/purchase-orders` - Create order
- `PUT /api/purchase-orders/{id}/receive` - Receive order

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Predictions
- `GET /api/predictions/demand` - Demand prediction for next 7 days

---

## 🎓 Next Steps

1. **Install MongoDB** (if not done)
2. **Register admin account**
3. **Add some categories:** Electronics, Office Supplies, etc.
4. **Add vendors:** Your suppliers
5. **Add products:** With pricing and initial stock
6. **Create purchase orders:** When you need to order more stock
7. **Track inventory:** Monitor stock levels

---

## 💡 Tips

- The application uses **JWT tokens** for authentication
- Tokens expire after 24 hours (configured in application.properties)
- All API calls (except auth) require the token in the Authorization header
- The frontend automatically handles token storage and inclusion
- Use **ROLE_ADMIN** for full access, **ROLE_USER** for limited access

---

## 📞 Support

If you encounter issues:
1. Check the browser console (F12) for errors
2. Check backend logs in terminal
3. Verify MongoDB is running
4. Ensure all dependencies are installed

---

**Good luck! 🚀**
