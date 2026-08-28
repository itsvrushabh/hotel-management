use sqlx::PgPool;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use crate::models::{
    Bill, CreateBill, CreateCustomer, CreateInventory, CreateOrder, CreateRecipe, Customer,
    Inventory, Order, Recipe,
};

pub fn order_service(pool: PgPool) -> Router {
    Router::new()
        .route("/", get(list_orders).post(create_order))
        .route("/:id", get(get_order))
        .with_state(pool)
}

pub fn recipe_service(pool: PgPool) -> Router {
    Router::new()
        .route("/", get(list_recipes).post(create_recipe))
        .route("/:id", get(get_recipe))
        .with_state(pool)
}

pub fn customer_service(pool: PgPool) -> Router {
    Router::new()
        .route("/", get(list_customers).post(create_customer))
        .route("/:id", get(get_customer))
        .with_state(pool)
}

pub fn inventory_service(pool: PgPool) -> Router {
    Router::new()
        .route("/", get(list_inventory).post(create_inventory))
        .with_state(pool)
}

pub fn billing_service(pool: PgPool) -> Router {
    Router::new()
        .route("/", get(list_bills).post(create_bill))
        .route("/:id", get(get_bill))
        .with_state(pool)
}

// Order handlers
async fn list_orders(State(pool): State<PgPool>) -> Result<Json<Vec<Order>>, StatusCode> {
    sqlx::query_as::<_, Order>("SELECT id, customer_id, status, total::float8 AS total, created_at FROM orders ORDER BY id DESC")
        .fetch_all(&pool)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn get_order(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
) -> Result<Json<Order>, StatusCode> {
    sqlx::query_as::<_, Order>(
        "SELECT id, customer_id, status, total::float8 AS total, created_at FROM orders WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .map(Json)
    .ok_or(StatusCode::NOT_FOUND)
}

async fn create_order(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateOrder>,
) -> Result<(StatusCode, Json<Order>), StatusCode> {
    let order = sqlx::query_as::<_, Order>(
        "INSERT INTO orders (customer_id, status, total) VALUES ($1, 'pending', $2) RETURNING id, customer_id, status, total::float8 AS total, created_at",
    )
    .bind(payload.customer_id)
    .bind(payload.total)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(order)))
}

// Recipe handlers
async fn list_recipes(State(pool): State<PgPool>) -> Result<Json<Vec<Recipe>>, StatusCode> {
    sqlx::query_as::<_, Recipe>(
        "SELECT id, name, ingredients, prep_time, price::float8 AS price, available FROM recipes ORDER BY id",
    )
    .fetch_all(&pool)
    .await
    .map(Json)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn get_recipe(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
) -> Result<Json<Recipe>, StatusCode> {
    sqlx::query_as::<_, Recipe>(
        "SELECT id, name, ingredients, prep_time, price::float8 AS price, available FROM recipes WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .map(Json)
    .ok_or(StatusCode::NOT_FOUND)
}

async fn create_recipe(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateRecipe>,
) -> Result<(StatusCode, Json<Recipe>), StatusCode> {
    let recipe = sqlx::query_as::<_, Recipe>(
        "INSERT INTO recipes (name, ingredients, prep_time, price, available) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, ingredients, prep_time, price::float8 AS price, available",
    )
    .bind(&payload.name)
    .bind(&payload.ingredients)
    .bind(payload.prep_time)
    .bind(payload.price)
    .bind(payload.available.unwrap_or(true))
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(recipe)))
}

// Customer handlers
async fn list_customers(State(pool): State<PgPool>) -> Result<Json<Vec<Customer>>, StatusCode> {
    sqlx::query_as::<_, Customer>(
        "SELECT id, phone, name, created_at FROM customers ORDER BY id DESC",
    )
    .fetch_all(&pool)
    .await
    .map(Json)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn get_customer(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
) -> Result<Json<Customer>, StatusCode> {
    sqlx::query_as::<_, Customer>(
        "SELECT id, phone, name, created_at FROM customers WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .map(Json)
    .ok_or(StatusCode::NOT_FOUND)
}

async fn create_customer(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateCustomer>,
) -> Result<(StatusCode, Json<Customer>), StatusCode> {
    let customer = sqlx::query_as::<_, Customer>(
        "INSERT INTO customers (phone, name) VALUES ($1, $2) RETURNING id, phone, name, created_at",
    )
    .bind(&payload.phone)
    .bind(&payload.name)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(customer)))
}

// Inventory handlers
async fn list_inventory(State(pool): State<PgPool>) -> Result<Json<Vec<Inventory>>, StatusCode> {
    sqlx::query_as::<_, Inventory>("SELECT id, name, quantity FROM inventory ORDER BY id")
        .fetch_all(&pool)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn create_inventory(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateInventory>,
) -> Result<(StatusCode, Json<Inventory>), StatusCode> {
    let inv = sqlx::query_as::<_, Inventory>(
        "INSERT INTO inventory (name, quantity) VALUES ($1, $2) RETURNING id, name, quantity",
    )
    .bind(&payload.name)
    .bind(payload.quantity)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(inv)))
}

// Billing handlers
async fn list_bills(State(pool): State<PgPool>) -> Result<Json<Vec<Bill>>, StatusCode> {
    sqlx::query_as::<_, Bill>(
        "SELECT id, order_id, total::float8 AS total, payment_method FROM bills ORDER BY id DESC",
    )
    .fetch_all(&pool)
    .await
    .map(Json)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn get_bill(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
) -> Result<Json<Bill>, StatusCode> {
    sqlx::query_as::<_, Bill>(
        "SELECT id, order_id, total::float8 AS total, payment_method FROM bills WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .map(Json)
    .ok_or(StatusCode::NOT_FOUND)
}

async fn create_bill(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateBill>,
) -> Result<(StatusCode, Json<Bill>), StatusCode> {
    let bill = sqlx::query_as::<_, Bill>(
        "INSERT INTO bills (order_id, total, payment_method) VALUES ($1, $2, $3) RETURNING id, order_id, total::float8 AS total, payment_method",
    )
    .bind(payload.order_id)
    .bind(payload.total)
    .bind(&payload.payment_method)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(bill)))
}
