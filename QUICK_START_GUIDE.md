# 🚀 Inventory Management System - Quick Start Guide

## ✅ Current Status
- ✅ Backend is running on http://localhost:8080
- ✅ Frontend opened in browser
- ⚠️ MongoDB needs to be installed (required for data storage)

---

## 📦 Step 1: Install MongoDB (Choose ONE Option)

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

---

## 🧪 Step 2: Test the Application

### 2.1 Test Backend Health
Open in browser or use curl:
```
http://localhost:8080/actuator/health
```

### 2.2 Register Admin User

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

### 2.3 Login to Frontend
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
