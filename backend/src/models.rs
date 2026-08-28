use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

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

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MenuItem {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    pub category: String,
    pub prep_time: i32,
    pub available: Option<bool>,
}

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

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Order {
    pub id: i64,
    pub customer_id: Option<i64>,
    pub status: String,
    pub total: f64,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOrder {
    pub customer_id: Option<i64>,
    pub total: f64,
}
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct OrderItem {
    pub id: i64,
    pub order_id: i64,
    pub menu_item_id: i64,
    pub quantity: i32,
    pub price: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Inventory {
    pub id: i64,
    pub name: String,
    pub quantity: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInventory {
    pub name: String,
    pub quantity: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Bill {
    pub id: i64,
    pub order_id: Option<i64>,
    pub total: f64,
    pub payment_method: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBill {
    pub order_id: Option<i64>,
    pub total: f64,
    pub payment_method: String,
}
