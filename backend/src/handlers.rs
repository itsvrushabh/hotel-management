use axum::{
    body::Bytes,
    extract::{Path, Query, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::IntoResponse,
    routing::{get, patch, post},
    Json, Router,
};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::Deserialize;
use sqlx::PgPool;

use crate::models::{
    AuthResponse, Bill, Claims, CreateBillRequest, CreateCustomer, CreateInventory, CreateMenuItem,
    CreateOrderRequest, CreateRecipe, CreateUserRequest, Customer, Inventory, LoginRequest,
    MenuItem, Order, OrderItem, OrderItemDetail, OrderWithItems, PopularItemAnalytics, Recipe,
    RevenueAnalytics, UpdateInventoryQuantity, UpdateOrderStatus, User,
};

const JWT_SECRET: &[u8] = b"hotel_management_secret_key_2026";

pub fn auth_service(pool: PgPool) -> Router {
    Router::new()
        .route("/register", post(register_user))
        .route("/login", post(login_user))
        .with_state(pool)
}

pub fn analytics_service(pool: PgPool) -> Router {
    Router::new()
        .route("/revenue", get(revenue_analytics))
        .route("/popular", get(popular_items_analytics))
        .with_state(pool)
}

pub fn menu_item_service(pool: PgPool) -> Router {
    Router::new()
        .route("/", get(list_menu_items).post(create_menu_item))
        .route("/:id", get(get_menu_item).put(update_menu_item).delete(delete_menu_item))
        .with_state(pool)
}

pub fn order_service(pool: PgPool) -> Router {
    Router::new()
        .route("/", get(list_orders).post(create_order))
        .route("/:id", get(get_order))
        .route("/:id/status", patch(update_order_status))
        .route("/code/:code", get(get_order_by_code))
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
        .route("/by-phone/:phone", get(get_customer_by_phone))
        .with_state(pool)
}

pub fn inventory_service(pool: PgPool) -> Router {
    Router::new()
        .route("/", get(list_inventory).post(create_inventory))
        .route("/:id/adjust", patch(adjust_inventory))
        .with_state(pool)
}

pub fn billing_service(pool: PgPool) -> Router {
    Router::new()
        .route("/", get(list_bills).post(create_bill))
        .route("/:id", get(get_bill))
        .route("/:id/pdf", get(generate_bill_pdf))
        .with_state(pool)
}

// --- Auth Handlers ---

async fn register_user(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), StatusCode> {
    let role = payload.role.unwrap_or_else(|| "staff".to_string());

    let hashed = bcrypt::hash(&payload.password, bcrypt::DEFAULT_COST).map_err(|e| {
        tracing::error!("Failed to hash password: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)
         RETURNING id, username, password_hash, role, created_at",
    )
    .bind(&payload.username)
    .bind(&hashed)
    .bind(&role)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to insert user: {:?}", e);
        StatusCode::BAD_REQUEST
    })?;

    let exp = (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize;
    let claims = Claims {
        sub: user.username.clone(),
        role: user.role.clone(),
        exp,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET),
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((
        StatusCode::CREATED,
        Json(AuthResponse {
            token,
            username: user.username,
            role: user.role,
        }),
    ))
}

async fn login_user(
    State(pool): State<PgPool>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, username, password_hash, role, created_at FROM users WHERE username = $1",
    )
    .bind(&payload.username)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::UNAUTHORIZED)?;

    let is_valid = bcrypt::verify(&payload.password, &user.password_hash)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if !is_valid {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let exp = (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize;
    let claims = Claims {
        sub: user.username.clone(),
        role: user.role.clone(),
        exp,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET),
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(AuthResponse {
        token,
        username: user.username,
        role: user.role,
    }))
}

// --- Analytics Handlers ---

async fn revenue_analytics(
    State(pool): State<PgPool>,
) -> Result<Json<RevenueAnalytics>, StatusCode> {
    let stats = sqlx::query_as::<_, RevenueAnalytics>(
        "SELECT 
            COALESCE(SUM(total), 0)::float8 AS total_revenue,
            COUNT(id) AS total_bills,
            (SELECT COUNT(id) FROM orders) AS total_orders
         FROM bills",
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch revenue analytics: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(stats))
}

async fn popular_items_analytics(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<PopularItemAnalytics>>, StatusCode> {
    let items = sqlx::query_as::<_, PopularItemAnalytics>(
        "SELECT 
            mi.id AS menu_item_id,
            mi.name,
            mi.category,
            COALESCE(SUM(oi.quantity), 0) AS total_ordered,
            COALESCE(SUM(oi.price * oi.quantity), 0)::float8 AS total_revenue
         FROM menu_items mi
         LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
         GROUP BY mi.id, mi.name, mi.category
         ORDER BY total_ordered DESC
         LIMIT 10",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch popular items analytics: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(items))
}

// --- Menu Item Handlers ---

#[derive(Debug, Deserialize)]
pub struct MenuFilter {
    pub category: Option<String>,
}

async fn list_menu_items(
    State(pool): State<PgPool>,
    Query(filter): Query<MenuFilter>,
) -> Result<Json<Vec<MenuItem>>, StatusCode> {
    let result = if let Some(cat) = filter.category {
        if cat.is_empty() || cat.eq_ignore_ascii_case("all") {
            sqlx::query_as::<_, MenuItem>(
                "SELECT id, name, description, price::float8 AS price, category, prep_time, available, image_url FROM menu_items ORDER BY category, id",
            )
            .fetch_all(&pool)
            .await
        } else {
            sqlx::query_as::<_, MenuItem>(
                "SELECT id, name, description, price::float8 AS price, category, prep_time, available, image_url FROM menu_items WHERE category ILIKE $1 ORDER BY id",
            )
            .bind(cat)
            .fetch_all(&pool)
            .await
        }
    } else {
        sqlx::query_as::<_, MenuItem>(
            "SELECT id, name, description, price::float8 AS price, category, prep_time, available, image_url FROM menu_items ORDER BY category, id",
        )
        .fetch_all(&pool)
        .await
    };

    result
        .map(Json)
        .map_err(|e| {
            tracing::error!("Failed to list menu items: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })
}

async fn get_menu_item(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
) -> Result<Json<MenuItem>, StatusCode> {
    sqlx::query_as::<_, MenuItem>(
        "SELECT id, name, description, price::float8 AS price, category, prep_time, available, image_url FROM menu_items WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get menu item {}: {:?}", id, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .map(Json)
    .ok_or(StatusCode::NOT_FOUND)
}

async fn create_menu_item(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateMenuItem>,
) -> Result<(StatusCode, Json<MenuItem>), StatusCode> {
    let prep_time = payload.prep_time.unwrap_or(15);
    let available = payload.available.unwrap_or(true);

    let item = sqlx::query_as::<_, MenuItem>(
        "INSERT INTO menu_items (name, description, price, category, prep_time, available, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, description, price::float8 AS price, category, prep_time, available, image_url",
    )
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(payload.price)
    .bind(&payload.category)
    .bind(prep_time)
    .bind(available)
    .bind(&payload.image_url)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create menu item: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok((StatusCode::CREATED, Json(item)))
}

async fn update_menu_item(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
    Json(payload): Json<CreateMenuItem>,
) -> Result<Json<MenuItem>, StatusCode> {
    let prep_time = payload.prep_time.unwrap_or(15);
    let available = payload.available.unwrap_or(true);

    let item = sqlx::query_as::<_, MenuItem>(
        "UPDATE menu_items 
         SET name = $1, description = $2, price = $3, category = $4, prep_time = $5, available = $6, image_url = $7
         WHERE id = $8
         RETURNING id, name, description, price::float8 AS price, category, prep_time, available, image_url",
    )
    .bind(&payload.name)
    .bind(&payload.description)
    .bind(payload.price)
    .bind(&payload.category)
    .bind(prep_time)
    .bind(available)
    .bind(&payload.image_url)
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update menu item {}: {:?}", id, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(item))
}

async fn delete_menu_item(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
) -> Result<StatusCode, StatusCode> {
    let result = sqlx::query("DELETE FROM menu_items WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to delete menu item {}: {:?}", id, e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    if result.rows_affected() == 0 {
        Err(StatusCode::NOT_FOUND)
    } else {
        Ok(StatusCode::NO_CONTENT)
    }
}

// --- Order Handlers ---

async fn list_orders(State(pool): State<PgPool>) -> Result<Json<Vec<Order>>, StatusCode> {
    sqlx::query_as::<_, Order>(
        "SELECT id, order_code, customer_id, table_number, room_number, order_type, status, total::float8 AS total, notes, created_at FROM orders ORDER BY id DESC",
    )
    .fetch_all(&pool)
    .await
    .map(Json)
    .map_err(|e| {
        tracing::error!("Failed to list orders: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })
}

async fn fetch_order_details(pool: &PgPool, order: Order) -> Result<OrderWithItems, StatusCode> {
    let items = sqlx::query_as::<_, OrderItemDetail>(
        "SELECT oi.id, oi.order_id, oi.menu_item_id, mi.name AS item_name, oi.quantity, oi.price::float8 AS price, oi.notes
         FROM order_items oi
         JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE oi.order_id = $1",
    )
    .bind(order.id)
    .fetch_all(pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to fetch order items for order {}: {:?}", order.id, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let customer = if let Some(cust_id) = order.customer_id {
        sqlx::query_as::<_, Customer>(
            "SELECT id, phone, name, created_at FROM customers WHERE id = $1",
        )
        .bind(cust_id)
        .fetch_optional(pool)
        .await
        .unwrap_or(None)
    } else {
        None
    };

    Ok(OrderWithItems {
        order,
        customer,
        items,
    })
}

async fn get_order(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
) -> Result<Json<OrderWithItems>, StatusCode> {
    let order = sqlx::query_as::<_, Order>(
        "SELECT id, order_code, customer_id, table_number, room_number, order_type, status, total::float8 AS total, notes, created_at FROM orders WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get order {}: {:?}", id, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    let details = fetch_order_details(&pool, order).await?;
    Ok(Json(details))
}

async fn get_order_by_code(
    State(pool): State<PgPool>,
    Path(code): Path<String>,
) -> Result<Json<OrderWithItems>, StatusCode> {
    let order = sqlx::query_as::<_, Order>(
        "SELECT id, order_code, customer_id, table_number, room_number, order_type, status, total::float8 AS total, notes, created_at FROM orders WHERE order_code = $1",
    )
    .bind(code)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get order by code: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    let details = fetch_order_details(&pool, order).await?;
    Ok(Json(details))
}

async fn create_order(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateOrderRequest>,
) -> Result<(StatusCode, Json<OrderWithItems>), StatusCode> {
    if payload.items.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let mut tx = pool.begin().await.map_err(|e| {
        tracing::error!("Failed to begin transaction: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // 1. Resolve or create customer if phone provided
    let mut resolved_customer_id = payload.customer_id;
    let mut customer_obj = None;

    if let Some(phone) = &payload.customer_phone {
        if !phone.trim().is_empty() {
            let cust = sqlx::query_as::<_, Customer>(
                "INSERT INTO customers (phone, name) VALUES ($1, $2)
                 ON CONFLICT (phone) DO UPDATE SET name = COALESCE(EXCLUDED.name, customers.name)
                 RETURNING id, phone, name, created_at",
            )
            .bind(phone.trim())
            .bind(&payload.customer_name)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("Failed to upsert customer: {:?}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

            resolved_customer_id = Some(cust.id);
            customer_obj = Some(cust);
        }
    }

    // 2. Fetch prices and validate items from database
    let mut computed_total = 0.0f64;
    let mut item_records = Vec::new();

    for item_req in &payload.items {
        if item_req.quantity <= 0 {
            return Err(StatusCode::BAD_REQUEST);
        }

        let menu_item = sqlx::query_as::<_, MenuItem>(
            "SELECT id, name, description, price::float8 AS price, category, prep_time, available, image_url FROM menu_items WHERE id = $1",
        )
        .bind(item_req.menu_item_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("Failed to query menu item: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?
        .ok_or(StatusCode::BAD_REQUEST)?;

        let line_price = menu_item.price * (item_req.quantity as f64);
        computed_total += line_price;
        item_records.push((menu_item, item_req.quantity, item_req.notes.clone()));
    }

    // 3. Generate unique order code
    let now = chrono::Utc::now();
    let order_code = format!("ORD-{}-{}", now.format("%Y%m%d%H%M%S"), uuid::Uuid::new_v4().simple().to_string()[..4].to_uppercase());
    let order_type = payload.order_type.unwrap_or_else(|| "dine_in".to_string());

    // 4. Insert order
    let order = sqlx::query_as::<_, Order>(
        "INSERT INTO orders (order_code, customer_id, table_number, room_number, order_type, status, total, notes)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
         RETURNING id, order_code, customer_id, table_number, room_number, order_type, status, total::float8 AS total, notes, created_at",
    )
    .bind(&order_code)
    .bind(resolved_customer_id)
    .bind(&payload.table_number)
    .bind(&payload.room_number)
    .bind(&order_type)
    .bind(computed_total)
    .bind(&payload.notes)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!("Failed to insert order: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // 5. Insert order items
    let mut order_item_details = Vec::new();
    for (mi, qty, notes) in item_records {
        let inserted_item = sqlx::query_as::<_, OrderItem>(
            "INSERT INTO order_items (order_id, menu_item_id, quantity, price, notes)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, order_id, menu_item_id, quantity, price::float8 AS price, notes",
        )
        .bind(order.id)
        .bind(mi.id)
        .bind(qty)
        .bind(mi.price)
        .bind(&notes)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("Failed to insert order item: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

        order_item_details.push(OrderItemDetail {
            id: inserted_item.id,
            order_id: order.id,
            menu_item_id: mi.id,
            item_name: mi.name,
            quantity: qty,
            price: mi.price,
            notes,
        });
    }

    tx.commit().await.map_err(|e| {
        tracing::error!("Failed to commit transaction: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok((
        StatusCode::CREATED,
        Json(OrderWithItems {
            order,
            customer: customer_obj,
            items: order_item_details,
        }),
    ))
}

async fn update_order_status(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateOrderStatus>,
) -> Result<Json<Order>, StatusCode> {
    let valid_statuses = ["pending", "confirmed", "preparing", "ready", "served", "cancelled"];
    if !valid_statuses.contains(&payload.status.to_lowercase().as_str()) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let order = sqlx::query_as::<_, Order>(
        "UPDATE orders SET status = $1 WHERE id = $2
         RETURNING id, order_code, customer_id, table_number, room_number, order_type, status, total::float8 AS total, notes, created_at",
    )
    .bind(payload.status.to_lowercase())
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to update order status {}: {:?}", id, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(order))
}

// --- Recipe Handlers ---

async fn list_recipes(State(pool): State<PgPool>) -> Result<Json<Vec<Recipe>>, StatusCode> {
    sqlx::query_as::<_, Recipe>(
        "SELECT id, name, ingredients, prep_time, price::float8 AS price, available FROM recipes ORDER BY id",
    )
    .fetch_all(&pool)
    .await
    .map(Json)
    .map_err(|e| {
        tracing::error!("Failed to list recipes: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })
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
    .map_err(|e| {
        tracing::error!("Failed to get recipe {}: {:?}", id, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
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
    .map_err(|e| {
        tracing::error!("Failed to create recipe: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok((StatusCode::CREATED, Json(recipe)))
}

// --- Customer Handlers ---

async fn list_customers(State(pool): State<PgPool>) -> Result<Json<Vec<Customer>>, StatusCode> {
    sqlx::query_as::<_, Customer>(
        "SELECT id, phone, name, created_at FROM customers ORDER BY id DESC",
    )
    .fetch_all(&pool)
    .await
    .map(Json)
    .map_err(|e| {
        tracing::error!("Failed to list customers: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })
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
    .map_err(|e| {
        tracing::error!("Failed to get customer {}: {:?}", id, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .map(Json)
    .ok_or(StatusCode::NOT_FOUND)
}

async fn get_customer_by_phone(
    State(pool): State<PgPool>,
    Path(phone): Path<String>,
) -> Result<Json<Customer>, StatusCode> {
    sqlx::query_as::<_, Customer>(
        "SELECT id, phone, name, created_at FROM customers WHERE phone = $1",
    )
    .bind(phone.trim())
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to lookup customer by phone: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .map(Json)
    .ok_or(StatusCode::NOT_FOUND)
}

async fn create_customer(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateCustomer>,
) -> Result<(StatusCode, Json<Customer>), StatusCode> {
    let customer = sqlx::query_as::<_, Customer>(
        "INSERT INTO customers (phone, name) VALUES ($1, $2)
         ON CONFLICT (phone) DO UPDATE SET name = COALESCE(EXCLUDED.name, customers.name)
         RETURNING id, phone, name, created_at",
    )
    .bind(payload.phone.trim())
    .bind(&payload.name)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create customer: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok((StatusCode::CREATED, Json(customer)))
}

// --- Inventory Handlers ---

async fn list_inventory(State(pool): State<PgPool>) -> Result<Json<Vec<Inventory>>, StatusCode> {
    sqlx::query_as::<_, Inventory>("SELECT id, name, quantity, unit FROM inventory ORDER BY id")
        .fetch_all(&pool)
        .await
        .map(Json)
        .map_err(|e| {
            tracing::error!("Failed to list inventory: {:?}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })
}

async fn create_inventory(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateInventory>,
) -> Result<(StatusCode, Json<Inventory>), StatusCode> {
    let unit = payload.unit.unwrap_or_else(|| "units".to_string());
    let inv = sqlx::query_as::<_, Inventory>(
        "INSERT INTO inventory (name, quantity, unit) VALUES ($1, $2, $3) RETURNING id, name, quantity, unit",
    )
    .bind(&payload.name)
    .bind(payload.quantity)
    .bind(unit)
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create inventory item: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok((StatusCode::CREATED, Json(inv)))
}

async fn adjust_inventory(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateInventoryQuantity>,
) -> Result<Json<Inventory>, StatusCode> {
    let inv = sqlx::query_as::<_, Inventory>(
        "UPDATE inventory SET quantity = GREATEST(0, quantity + $1) WHERE id = $2 RETURNING id, name, quantity, unit",
    )
    .bind(payload.delta)
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to adjust inventory: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(inv))
}

// --- Billing Handlers ---

async fn list_bills(State(pool): State<PgPool>) -> Result<Json<Vec<Bill>>, StatusCode> {
    sqlx::query_as::<_, Bill>(
        "SELECT id, order_id, total::float8 AS total, payment_method, created_at FROM bills ORDER BY id DESC",
    )
    .fetch_all(&pool)
    .await
    .map(Json)
    .map_err(|e| {
        tracing::error!("Failed to list bills: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })
}

async fn get_bill(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
) -> Result<Json<Bill>, StatusCode> {
    sqlx::query_as::<_, Bill>(
        "SELECT id, order_id, total::float8 AS total, payment_method, created_at FROM bills WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to get bill {}: {:?}", id, e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .map(Json)
    .ok_or(StatusCode::NOT_FOUND)
}

async fn create_bill(
    State(pool): State<PgPool>,
    Json(payload): Json<CreateBillRequest>,
) -> Result<(StatusCode, Json<Bill>), StatusCode> {
    let mut tx = pool.begin().await.map_err(|e| {
        tracing::error!("Failed to begin tx for billing: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    // 1. Fetch order and verify its total
    let order = sqlx::query_as::<_, Order>(
        "SELECT id, order_code, customer_id, table_number, room_number, order_type, status, total::float8 AS total, notes, created_at FROM orders WHERE id = $1",
    )
    .bind(payload.order_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!("Failed to find order for bill: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?
    .ok_or(StatusCode::BAD_REQUEST)?;

    // 2. Insert bill record
    let bill = sqlx::query_as::<_, Bill>(
        "INSERT INTO bills (order_id, total, payment_method)
         VALUES ($1, $2, $3)
         ON CONFLICT (order_id) DO UPDATE SET payment_method = EXCLUDED.payment_method
         RETURNING id, order_id, total::float8 AS total, payment_method, created_at",
    )
    .bind(order.id)
    .bind(order.total)
    .bind(&payload.payment_method)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| {
        tracing::error!("Failed to create bill: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    tx.commit().await.map_err(|e| {
        tracing::error!("Failed to commit bill tx: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok((StatusCode::CREATED, Json(bill)))
}

async fn generate_bill_pdf(
    State(pool): State<PgPool>,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, StatusCode> {
    let bill = sqlx::query_as::<_, Bill>(
        "SELECT id, order_id, total::float8 AS total, payment_method, created_at FROM bills WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::NOT_FOUND)?;

    let order = if let Some(order_id) = bill.order_id {
        sqlx::query_as::<_, Order>(
            "SELECT id, order_code, customer_id, table_number, room_number, order_type, status, total::float8 AS total, notes, created_at FROM orders WHERE id = $1",
        )
        .bind(order_id)
        .fetch_optional(&pool)
        .await
        .unwrap_or(None)
    } else {
        None
    };

    let items = if let Some(ord) = &order {
        sqlx::query_as::<_, OrderItemDetail>(
            "SELECT oi.id, oi.order_id, oi.menu_item_id, mi.name AS item_name, oi.quantity, oi.price::float8 AS price, oi.notes
             FROM order_items oi
             JOIN menu_items mi ON oi.menu_item_id = mi.id
             WHERE oi.order_id = $1",
        )
        .bind(ord.id)
        .fetch_all(&pool)
        .await
        .unwrap_or_default()
    } else {
        Vec::new()
    };

    use printpdf::*;
    let (doc, page1, layer1) = PdfDocument::new(
        format!("Invoice #{}", bill.id),
        Mm(210.0),
        Mm(297.0),
        "Layer 1",
    );
    let font = doc.add_builtin_font(BuiltinFont::Helvetica).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let current_layer = doc.get_page(page1).get_layer(layer1);

    // Title
    current_layer.use_text("GRAND PALACE HOTEL & RESTAURANT", 18.0, Mm(20.0), Mm(270.0), &font_bold);
    current_layer.use_text("Tax Invoice / Receipt", 12.0, Mm(20.0), Mm(260.0), &font);

    // Metadata
    let bill_id_str = format!("Bill Number: BILL-{}", bill.id);
    current_layer.use_text(&bill_id_str, 10.0, Mm(20.0), Mm(245.0), &font);

    let payment_str = format!("Payment Method: {}", bill.payment_method.to_uppercase());
    current_layer.use_text(&payment_str, 10.0, Mm(20.0), Mm(238.0), &font);

    if let Some(ord) = &order {
        let ord_str = format!("Order Code: {}", ord.order_code);
        current_layer.use_text(&ord_str, 10.0, Mm(20.0), Mm(231.0), &font);

        let table_str = format!("Dining: {} ({})", ord.table_number.as_deref().unwrap_or(ord.room_number.as_deref().unwrap_or("Takeaway")), ord.order_type);
        current_layer.use_text(&table_str, 10.0, Mm(20.0), Mm(224.0), &font);
    }

    // Line items Header
    current_layer.use_text("------------------------------------------------------------------------------------------------------", 10.0, Mm(20.0), Mm(212.0), &font);
    current_layer.use_text("Item Description", 10.0, Mm(20.0), Mm(206.0), &font_bold);
    current_layer.use_text("Qty", 10.0, Mm(120.0), Mm(206.0), &font_bold);
    current_layer.use_text("Price (INR)", 10.0, Mm(145.0), Mm(206.0), &font_bold);
    current_layer.use_text("Total (INR)", 10.0, Mm(175.0), Mm(206.0), &font_bold);
    current_layer.use_text("------------------------------------------------------------------------------------------------------", 10.0, Mm(20.0), Mm(200.0), &font);

    // Line items
    let mut y = 192.0;
    for it in &items {
        if y < 40.0 {
            break; // keep simple single page invoice
        }
        let line_total = it.price * (it.quantity as f64);
        current_layer.use_text(&it.item_name, 9.0, Mm(20.0), Mm(y), &font);
        current_layer.use_text(&format!("{}", it.quantity), 9.0, Mm(120.0), Mm(y), &font);
        current_layer.use_text(&format!("{:.2}", it.price), 9.0, Mm(145.0), Mm(y), &font);
        current_layer.use_text(&format!("{:.2}", line_total), 9.0, Mm(175.0), Mm(y), &font);
        y -= 8.0;
    }

    // Total section
    let total_y = y - 5.0;
    current_layer.use_text("------------------------------------------------------------------------------------------------------", 10.0, Mm(20.0), Mm(total_y), &font);
    let total_str = format!("GRAND TOTAL: INR {:.2}", bill.total);
    current_layer.use_text(&total_str, 12.0, Mm(130.0), Mm(total_y - 8.0), &font_bold);
    current_layer.use_text("Thank you for dining with us! Save Trees - Digital Receipt.", 9.0, Mm(20.0), Mm(total_y - 20.0), &font);

    let mut pdf_bytes = Vec::new();
    doc.save(&mut std::io::BufWriter::new(&mut pdf_bytes)).map_err(|e| {
        tracing::error!("Failed to render PDF: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, HeaderValue::from_static("application/pdf"));
    let content_disp = format!("inline; filename=\"invoice_{}.pdf\"", bill.id);
    if let Ok(val) = HeaderValue::from_str(&content_disp) {
        headers.insert(header::CONTENT_DISPOSITION, val);
    }

    Ok((headers, Bytes::from(pdf_bytes)))
}
