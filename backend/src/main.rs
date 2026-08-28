// hotel-backend/src/main.rs
// Axum API server for hotel management system

use axum::extract::State;
use axum::http::{HeaderName, Method, StatusCode};
use axum::routing::get;
use axum::{Json, Router};
use sqlx::PgPool;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};

// Modules
mod handlers;
mod models;

// Handlers
use crate::handlers::{
    analytics_service, auth_service, billing_service, customer_service, inventory_service,
    menu_item_service, order_service, recipe_service,
};

fn setup_logging() {
    tracing_subscriber::fmt::init();
}

async fn health_check(State(pool): State<PgPool>) -> Result<Json<serde_json::Value>, StatusCode> {
    sqlx::query("SELECT 1")
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Database health check failed: {:?}", e);
            StatusCode::SERVICE_UNAVAILABLE
        })?;

    Ok(Json(serde_json::json!({
        "status": "healthy",
        "service": "hotel-backend",
        "database": "connected"
    })))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    setup_logging();

    let db_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://hotel_pass:hotel_pass@localhost:5432/hotel_management".to_string()
    });

    // Database connection
    let pool = PgPool::connect(&db_url).await?;
    tracing::info!("Database connected");

    // Initialize tables
    sqlx::migrate!("./migrations").run(&pool).await?;
    tracing::info!("Database initialized");

    // CORS setup allowing dev frontend requests
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::PATCH,
            Method::OPTIONS,
        ])
        .allow_headers([
            HeaderName::from_static("authorization"),
            HeaderName::from_static("content-type"),
            HeaderName::from_static("accept"),
        ]);

    // Create API router
    let app = Router::new()
        .route("/health", get(health_check).with_state(pool.clone()))
        .route("/api/health", get(health_check).with_state(pool.clone()))
        .nest("/api/auth", auth_service(pool.clone()))
        .nest("/api/analytics", analytics_service(pool.clone()))
        .nest("/api/menu-items", menu_item_service(pool.clone()))
        .nest("/api/orders", order_service(pool.clone()))
        .nest("/api/recipes", recipe_service(pool.clone()))
        .nest("/api/customers", customer_service(pool.clone()))
        .nest("/api/inventory", inventory_service(pool.clone()))
        .nest("/api/billing", billing_service(pool.clone()))
        .layer(cors);

    // Start server
    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = TcpListener::bind(&addr).await?;
    tracing::info!("Server listening on http://{}", addr);

    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
            tracing::info!("Shutdown signal received");
        })
        .await?;

    Ok(())
}
