use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// --- Customer Models ---

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Customer {
    pub id: i64,
    pub phone: String,
    pub name: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCustomer {
    pub phone: String,
    pub name: Option<String>,
}

// --- Menu Item Models ---

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MenuItem {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    pub category: String,
    pub prep_time: i32,
    pub available: Option<bool>,
    pub image_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMenuItem {
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    pub category: String,
    pub prep_time: Option<i32>,
    pub available: Option<bool>,
    pub image_url: Option<String>,
}

// --- Order Item Models ---

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OrderItem {
    pub id: i64,
    pub order_id: i64,
    pub menu_item_id: i64,
    pub quantity: i32,
    pub price: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrderItemRequest {
    pub menu_item_id: i64,
    pub quantity: i32,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OrderItemDetail {
    pub id: i64,
    pub order_id: i64,
    pub menu_item_id: i64,
    pub item_name: String,
    pub quantity: i32,
    pub price: f64,
    pub notes: Option<String>,
}

// --- Order Models ---

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Order {
    pub id: i64,
    pub order_code: String,
    pub customer_id: Option<i64>,
    pub table_number: Option<String>,
    pub room_number: Option<String>,
    pub order_type: String,
    pub status: String,
    pub total: f64,
    pub notes: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrderRequest {
    pub customer_phone: Option<String>,
    pub customer_name: Option<String>,
    pub customer_id: Option<i64>,
    pub table_number: Option<String>,
    pub room_number: Option<String>,
    pub order_type: Option<String>,
    pub notes: Option<String>,
    pub items: Vec<CreateOrderItemRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderWithItems {
    #[serde(flatten)]
    pub order: Order,
    pub customer: Option<Customer>,
    pub items: Vec<OrderItemDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateOrderStatus {
    pub status: String,
}

// --- Recipe Models ---

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Recipe {
    pub id: i64,
    pub name: String,
    pub ingredients: serde_json::Value,
    pub prep_time: i32,
    pub price: f64,
    pub available: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRecipe {
    pub name: String,
    pub ingredients: serde_json::Value,
    pub prep_time: i32,
    pub price: f64,
    pub available: Option<bool>,
}

// --- Inventory Models ---

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Inventory {
    pub id: i64,
    pub name: String,
    pub quantity: i32,
    pub unit: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInventory {
    pub name: String,
    pub quantity: i32,
    pub unit: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInventoryQuantity {
    pub delta: i32,
}

// --- Billing Models ---

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Bill {
    pub id: i64,
    pub order_id: Option<i64>,
    pub total: f64,
    pub payment_method: String,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBillRequest {
    pub order_id: i64,
    pub payment_method: String,
}

// --- Auth Models ---

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub password_hash: String,
    pub role: String,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub role: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthResponse {
    pub token: String,
    pub username: String,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub role: String,
    pub exp: usize,
}

// --- Analytics Models ---

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RevenueAnalytics {
    pub total_revenue: f64,
    pub total_bills: i64,
    pub total_orders: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PopularItemAnalytics {
    pub menu_item_id: i64,
    pub name: String,
    pub category: String,
    pub total_ordered: i64,
    pub total_revenue: f64,
}

// --- Service Request Models (Hotel Services) ---

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ServiceRequest {
    pub id: i64,
    pub room_number: String,
    pub service_type: String, // 'laundry', 'housekeeping', 'amenities', 'maintenance'
    pub status: String, // 'pending', 'in_progress', 'completed'
    pub description: Option<String>,
    pub requested_by: Option<String>, // 'guest' or 'frontdesk'
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateServiceRequest {
    pub room_number: String,
    pub service_type: String,
    pub description: Option<String>,
    pub requested_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateServiceRequestStatus {
    pub status: String,
}
