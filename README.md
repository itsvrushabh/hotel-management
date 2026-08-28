### Phase 6: Staff Interface

1. **Order Entry Interface**
   - New order creation flow
   - Cart management

2. **Order Queue View**
   - Real-time order list
   - Status indicators
   - Keyboard navigation
### Phase 4: Web Frontend

1. **Setup Bun + React project**
   - Initialize with React and TypeScript
   - Configure Bun.serve with hot reload
   - Setup API integration and WebSocket hook

2. **Customer Interface**

   - Menu page with categories and daily specials
   - Cart with item management
   - Checkout flow with phone number verification
   - Order history view
- Configure sqlx with PostgreSQL
- Create migration files for all tables
- Setup connection pool with proper configuration
- Define structs for all entities (Order, Recipe, Inventory, Customer, Bill)
- Implement CRUD operations using sqlx
- Add proper error handling and validation
# Hotel Management System - Implementation Plan

### Table of Contents
1. [Context](#context)
2. [User Flows](#user-flows)
3. [Staff Interface](#staff-interface)
4. [Owner Dashboard](#owner-dashboard)
5. [API Specification](#api-specification)
6. [Implementation Phases](#implementation-phases)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Strategy](#deployment-strategy)
9. [Post-Launch](#post-launch)
---

## Context

Building a comprehensive hotel/restaurant management application with multiple interfaces to handle:

- **Customer ordering** via web app and WhatsApp Business API
- **Order tracking** with real-time status updates
- **Inventory management** for food supplies
- **Recipe management** with CRUD operations for owners
- **Billing system** with customer history
- **Customer retention** tracking order history and preferences

## User Flows - Detailed Step-by-Step

### Flow 1: Customer Orders via Web App

1. **Landing/Menu Page**
   - Customer opens web app (no login required initially)
   - Sees menu organized by categories (Appetizers, Main Course, Desserts, Beverages)
   - "Today's Specials" banner at top with highlighted items
   - Each item shows: photo, name, price, description, prep time
   - Search bar to filter items
   - Cart icon in header shows item count

2. **Adding Items to Cart**
   - Customer clicks on menu item → modal opens with details
   - Selects quantity using +/- buttons
   - Option to add special instructions (text field: "No onions", "Extra spicy", etc.)
   - Clicks "Add to Cart"
   - Toast notification: "Item added to cart"
   - Cart icon updates count

3. **Review Cart**
   - Customer clicks cart icon → Cart page opens
   - Shows all items with quantities, individual prices
   - Can modify quantity or remove items
   - Special instructions shown under each item
   - Subtotal, tax, and total displayed
   - "Proceed to Checkout" button

4. **Checkout**
   - Phone number input field (required)
   - Optional: Table number or Room number
   - Optional: Name (for first-time customers)
   - As they type phone number, system checks if customer exists
   - If returning customer: Shows welcome message "Welcome back, [Name]!" and their last order
   - Shows "New items since your last visit" section if applicable
   - Review order summary
   - "Place Order" button

5. **Order Confirmation**
   - Order submitted → Shows order number (e.g., "ORD-20260823-001")
   - Estimated preparation time
   - Current status: "Order Received → Confirmed → Preparing → Ready"
   - Option to track order status
   - Option to view order history

6. **Track Order (Real-time)**
   - Customer can return to track page by entering order number
   - WebSocket connection shows live status updates
   - Progress bar with stages: Pending → Confirmed → Preparing → Ready → Served
   - Estimated time updates as kitchen progresses

### Flow 2: Customer Orders via WhatsApp Business API

1. **Bot Initialization**
   - Customer saves business WhatsApp number to contacts
   - Sends "Hi" or any message to start conversation
   - Business account responds with welcome message template:
     - "Welcome to [Hotel Name]! 🍽️"
     - Quick reply buttons: [📋 View Menu] [📦 My Orders] [⭐ Today's Specials]
   - System captures customer's phone number automatically (WhatsApp verified)
   - Checks if customer exists in database
   - If new: "Thanks for contacting us! You can browse our menu anytime."
   - If returning: "Welcome back! You last ordered [X] on [Date]."

2. **Browse Menu**
   - Customer taps "View Menu" or types "menu"
   - Bot sends interactive list message with categories:
     ```
     Choose a category:
     • 🍕 Appetizers
     • 🍛 Main Course  
     • 🍰 Desserts
     • 🥤 Beverages
     • ⭐ Today's Specials
     ```
   - Customer selects category
   - Bot sends list of items in that category (up to 10 items per message)
   - Each item shows: Name, brief description, price

3. **View Item Details**
   - Customer taps/selects item from list
   - Bot sends:
     - Photo of dish (if available)
     - Full name and description
     - Price and preparation time
     - Interactive buttons: [Add to Cart] [View Other Items]

4. **Add to Cart**
   - Customer taps "Add to Cart"
   - Bot asks: "How many would you like?"
   - Customer replies with number (e.g., "2")
   - Bot asks: "Any special instructions?" 
   - Quick replies: [No] [Custom]
   - If custom → Customer types instructions
   - Bot confirms: "✅ Added [Item] x[Qty] to cart (₹[Amount])"
   - Shows buttons: [Continue Shopping] [View Cart] [Checkout]

5. **Review and Checkout**
   - Customer taps "View Cart"
   - Bot sends cart summary message:
     ```
     🛒 Your Cart:
     
     1. Margherita Pizza x2 - ₹400
        Note: No olives
     2. Garlic Bread x1 - ₹150
     
     Subtotal: ₹550
     Tax (5%): ₹27.50
     ━━━━━━━━━━━━━━━━━
     Total: ₹577.50
     ```
   - Interactive buttons: [Place Order] [Edit Cart] [Clear Cart]

6. **Place Order**
   - Customer taps "Place Order"
   - Bot asks: "Where should we deliver/serve?"
   - List message options:
     - Table Number
     - Room Number
     - Takeaway
   - Customer selects and provides number if needed
   - Bot processes order and sends confirmation:
       - "✅ Order Confirmed!"
       - "Order #ORD-20260823-001"
       - "Estimated time: 25 minutes"
       - "We'll notify you when your order is ready!"

7. **Track Order (Automated Updates)**
   - Bot automatically sends status updates using WhatsApp template messages:
     - "🔔 Your order #ORD-XXX is being prepared..."
     - "👨‍🍳 Your order is 50% complete!"
     - "✅ Your order #ORD-XXX is ready! Please collect from counter."
   - Customer can also check status manually:
     - Types "status" or "track order"
     - Bot shows current status with progress

8. **Order History**
   - Customer types "my orders" or taps "My Orders" button
   - Bot sends last 5 orders with:
     - Order number, date, total amount
     - Interactive button to view details
   - Customer can reorder previous orders with one tap

9. **WhatsApp-Specific Features**
   - **Rich Media**: Product images, menu cards as images
   - **Quick Replies**: Pre-defined response buttons
   - **Interactive Lists**: Scrollable menu selections
   - **Template Messages**: Automated order confirmations and updates
   - **Location Sharing**: Customer can share location for delivery (future)
   - **Voice Messages**: Customer can send voice notes for special instructions

### Flow 3: Front Desk/Waiter Takes Order (Web Interface)

1. **Staff Login**
   - Open web app at `/staff` route
   - Enter username and password
   - System authenticates and loads role-specific dashboard
   - Waiter sees simplified interface focused on order entry

2. **New Walk-in Customer**
   - Waiter taps "New Order" button (large, prominent)
   - First screen: "Customer Phone Number" input
   - As waiter types, system searches existing customers
   - If exists: Shows customer name and last order
   - If new: Option to add name (optional)

3. **Taking Order**
   - **Quick Entry Mode**: Grid view of all menu items with photos
   - Categories as tabs across top
   - Waiter taps items → quantity selector appears
   - Can add special instructions via quick tap
   - Pre-defined instruction chips: [No Onion] [Extra Spicy] [Less Salt] [Custom...]
   - Cart summary always visible on right side of screen (or bottom on mobile)

4. **Review and Modify**
   - Cart shows all items
   - Swipe to delete item
   - Tap item to modify quantity or instructions
   - Shows running total

5. **Table/Room Assignment**
   - Waiter enters table number or room number
   - Optional: Can mark as "Dine-in", "Takeaway", or "Room Service"

6. **Submit Order**
   - Large "Submit Order" button
   - Order sent to kitchen
   - Order number displayed: "ORD-20260823-005"
   - Confirmation screen with print option
   - "Start New Order" button to continue

7. **Order Status Monitoring**
   - Separate tab: "Active Orders"
   - Shows all orders in progress for their assigned tables
   - Color-coded status indicators:
     - 🟡 Yellow: Pending/Confirmed
     - 🔵 Blue: Preparing
     - 🟢 Green: Ready
   - Tap order to see details
   - Can notify customer when ready

8. **Generate Bill**
   - From "Active Orders", tap "Generate Bill"
   - Or from main menu: "Generate Bill" → Enter order number
   - Shows itemized bill with:
     - Items, quantities, prices
     - Subtotal, tax breakdown
     - Total amount
   - Options to add discount (if authorized)
   - Payment method selection: [Cash] [Card] [UPI] [Room Charge]
   - **Eco-Friendly Option**: "Would you like to save trees? 🌳"
     - Quick buttons: [📱 Digital Bill] [🖨️ Print Bill]
     - If Digital: 
       - Generate PDF bill
       - Send via WhatsApp, SMS, or email
       - Show "Thank you for saving paper! 🌱" message
       - Track eco-friendly bills in analytics
     - If Print:
       - Print physical bill
       - Option to also send digital copy
   - Mark as paid
   - Option to split bill (advanced feature)

## API Specification

This section defines the RESTful API that powers the entire application. The API is designed to be stateless, using HTTP methods to represent CRUD operations.

### Base URL

```
https://api.hotel-management.local/
```

### Authentication

All API requests must include a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are issued to authenticated users and expire after 24 hours.

### Endpoints

#### Customers

- **GET /customers** — List all customers
- **GET /customers/{id}** — Get customer details
- **POST /customers** — Create a new customer
- **PUT /customers/{id}** — Update a customer
- **DELETE /customers/{id}** — Delete a customer

#### Menu Items

- **GET /items** — List all menu items
- **GET /items/{id}** — Get item details
- **POST /items** — Create a new item
- **PUT /items/{id}** — Update an item
- **DELETE /items/{id}** — Delete an item

#### Orders

- **GET /orders** — List all orders
- **GET /orders/{id}** — Get order details
- **POST /orders** — Create a new order
- **PUT /orders/{id}** — Update an order
- **DELETE /orders/{id}** — Delete an order

#### Billing

- **GET /billing/{orderId}** — Get order bill
- **POST /billing/{orderId}/pay** — Process payment

#### Analytics

- **GET /analytics/revenue** — Revenue analytics
- **GET /analytics/popular** — Popular items

## Implementation Phases

### Phase 1: Database Setup

- Define all database tables and schema
- Set up database connections
- Migrate existing data
- Define structs for all entities (Order, Recipe, Inventory, Customer, Bill)
- Implement CRUD operations using sqlx
- Add proper error handling and validation

### Phase 2: Core API

- Build the basic CRUD endpoints
- Set up authentication and authorization
- Test all endpoints independently

### Phase 3: PDF Generation

- Integrate PDF generation for billing
- Test PDF export functionality

### Phase 4: Web Frontend

- Build the customer-facing web app
- Implement order tracking

### Phase 5: WhatsApp Integration

- Set up WhatsApp Business API
- Build bot interface

### Phase 6: Staff Interface

- Build the waiter's order entry interface
- Create the kitchen display system (TUI)

## Testing Strategy

### Unit Testing

- All business logic functions are unit tested
- Mock external dependencies

### Integration Testing

- Test API endpoints with mock data
- Test database interactions

### End-to-End Testing

- Test complete user flows
- Test front-end functionality

### Performance Testing

- Load testing for high-concurrency scenarios
- Response time benchmarks

## Deployment Strategy

- Containerize the application with Docker Compose for development and staging
- Deploy with Kubernetes for production-scale deployments