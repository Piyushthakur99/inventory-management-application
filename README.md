# Inventory Management System

Full-stack application to manage categories, vendors, products, inventory transactions, and purchase orders.

## 1. Tech Stack

- Backend: Java 21, Spring Boot 3.2, Spring Security, JWT, MongoDB
- Frontend: HTML, CSS, JavaScript
- Build tool: Maven

## 2. Project Structure

```text
backend/
  src/main/java/com/inventory/management/
    config/
    controller/
    dto/
    exception/
    model/
    repository/
    security/
    service/
  src/main/resources/application.properties
  pom.xml

frontend/
  index.html
  dashboard.html
  products.html
  vendors.html
  inventory.html
  purchase-orders.html
  js/
  css/
```

## 3. Prerequisites

- Java 21
- Maven 3.9+
- MongoDB (local or Atlas)
- VS Code Live Server extension (recommended for frontend)

Verify tools:

```powershell
java -version
mvn -version
mongod --version
```

## 4. Configure Database

Default backend configuration is already set in `backend/src/main/resources/application.properties`:

```properties
spring.data.mongodb.uri=mongodb://localhost:27017/inventory_db
spring.data.mongodb.database=inventory_db
server.port=8080
```

If you use MongoDB Atlas, update the URI in the same file.

## 5. Build, Run, and Verify Backend

From `backend` folder:

```powershell
cd backend
mvn clean package -DskipTests
```

Run with Maven:

```powershell
mvn spring-boot:run
```

Or run the built jar:

```powershell
java -jar target/inventory-management-0.0.1-SNAPSHOT.jar
```

Backend base URL:

```text
http://localhost:8080
```

## 6. Run Frontend

Use one of these options:

1. VS Code Live Server
- Open `frontend/index.html`
- Right click and choose `Open with Live Server`

2. Static server from `frontend` folder (Python example)

```powershell
cd frontend
python -m http.server 5500
```

Open:

```text
http://localhost:5500/index.html
```

## 7. Complete Postman Setup and Usage Process

Create a Postman environment variable:

- `baseUrl` = `http://localhost:8080`
- `token` (leave empty initially)

For protected APIs, add header:

```text
Authorization: Bearer {{token}}
```

### Step 1: Register Admin User (Add Role in Postman)

Request:

```http
POST {{baseUrl}}/api/auth/register
Content-Type: application/json
```

Body:

```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "admin123",
  "fullName": "Admin User",
  "roles": ["ROLE_ADMIN"]
}
```

How role is added:

- Roles are passed in the `roles` array.
- Valid roles in this project are `ROLE_ADMIN` and `ROLE_STAFF`.
- If `roles` is omitted or empty, backend defaults to `ROLE_STAFF`.

### Step 2: Login and Save JWT Token

Request:

```http
POST {{baseUrl}}/api/auth/login
Content-Type: application/json
```

Body:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Copy `token` from response and save it to Postman environment variable `token`.

### Step 3: Register Staff User (Role Assignment Example)

Request:

```http
POST {{baseUrl}}/api/auth/register
Content-Type: application/json
```

Body:

```json
{
  "username": "staff1",
  "email": "staff1@example.com",
  "password": "staff123",
  "fullName": "Staff User",
  "roles": ["ROLE_STAFF"]
}
```

### Step 4: Verify Role Behavior

Use admin token:

- Should succeed: `POST /api/categories`, `POST /api/vendors`, `POST /api/products`, `POST /api/orders`

Use staff token:

- Should fail with `403` on admin-only endpoints above
- Should succeed on read endpoints like `GET /api/products`, `GET /api/vendors`, `GET /api/orders`

### Important Note About Changing Existing Roles

Current code does not provide a dedicated API endpoint to update roles for an existing user.
To change role of an existing user, update the user document in MongoDB (`users` collection) or register a new user with desired roles.

## 8. Recommended End-to-End Usage Flow

1. Register and login as admin.
2. Create categories.
3. Create vendors.
4. Create products.
5. Adjust stock using product stock endpoint.
6. Create purchase order.
7. Mark purchase order status as `RECEIVED` to increase stock.
8. Verify stats in dashboard API.

## 9. Main API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Categories

- `POST /api/categories` (ADMIN)
- `PUT /api/categories/{id}` (ADMIN)
- `DELETE /api/categories/{id}` (ADMIN)
- `GET /api/categories`

### Vendors

- `POST /api/vendors` (ADMIN)
- `PUT /api/vendors/{id}` (ADMIN)
- `DELETE /api/vendors/{id}` (ADMIN)
- `GET /api/vendors`
- `GET /api/vendors/search?name=&page=0&size=10`
- `GET /api/vendors/{id}`

### Products

- `POST /api/products` (ADMIN)
- `PUT /api/products/{id}` (ADMIN)
- `DELETE /api/products/{id}` (ADMIN)
- `GET /api/products?page=0&size=10&search=`
- `GET /api/products/{id}`
- `GET /api/products/low-stock`
- `PATCH /api/products/{id}/stock`

`PATCH /api/products/{id}/stock` body:

```json
{
  "quantityChange": 10,
  "reason": "Manual restock"
}
```

### Purchase Orders

- `POST /api/orders` (ADMIN)
- `PATCH /api/orders/{id}/status` (ADMIN)
- `GET /api/orders`
- `GET /api/orders/{id}`
- `GET /api/orders/status/{status}`

Create order body:

```json
{
  "vendorId": "<vendorId>",
  "expectedDeliveryDate": "2026-03-25T10:30:00",
  "notes": "Urgent delivery",
  "items": [
    {
      "productId": "<productId>",
      "quantity": 5,
      "unitPrice": 1000.00
    }
  ]
}
```

Update status body:

```json
{
  "status": "RECEIVED"
}
```

### Inventory and Transactions

- `GET /api/inventory/transactions?page=0&size=20`
- `GET /api/inventory/transactions/product/{productId}`
- `GET /api/transactions`
- `GET /api/transactions/product/{productId}?page=0&size=20`
- `GET /api/transactions/user/{username}`

### Dashboard

- `GET /api/dashboard/stats`

## 10. Troubleshooting

### MongoDB connection error

- Ensure MongoDB service is running.
- Recheck `spring.data.mongodb.uri` in `application.properties`.

### Unauthorized or 403 in Postman

- Verify `Authorization: Bearer {{token}}` header.
- Login again and refresh token.
- Confirm user role is correct.

### Port 8080 already in use

```powershell
netstat -ano | findstr :8080
```

Kill process if needed:

```powershell
Stop-Process -Id <PID> -Force
```

## 11. Build Verification Status

Backend has been verified with:

- `mvn clean package -DskipTests` -> success
- `mvn test` -> success

Generated artifact:

- `backend/target/inventory-management-0.0.1-SNAPSHOT.jar`
