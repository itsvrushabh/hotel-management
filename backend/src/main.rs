// hotel-backend/src/main.rs
// Axum API server for hotel management system

use axum::http::{HeaderName, HeaderValue, Method};
use axum::Router;
use sqlx::PgPool;
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;

// Modules
mod handlers;
mod models;

// Handlers
use crate::handlers::{
    billing_service, customer_service, inventory_service, order_service, recipe_service,
};

fn setup_logging() {
    tracing_subscriber::fmt::init();
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
    sqlx::migrate!().run(&pool).await?;
    tracing::info!("Database initialized");

    // CORS setup
    let cors = CorsLayer::new()
        .allow_origin(
            "http://localhost:3000"
                .parse::<HeaderValue>()
                .unwrap_or_else(|_| HeaderValue::from_static("http://localhost:3000")),
        )
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::PATCH,
        ])
        .allow_headers([
            HeaderName::from_static("authorization"),
            HeaderName::from_static("content-type"),
        ]);

    // Create API router
    let app = Router::new()
        .nest("/api/orders", order_service(pool.clone()))
        .nest("/api/recipes", recipe_service(pool.clone()))
        .nest("/api/customers", customer_service(pool.clone()))
        .nest("/api/inventory", inventory_service(pool.clone()))
        .nest("/api/billing", billing_service(pool.clone()))
        .layer(cors);

    // Start server
    let listener = TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("Server listening on http://0.0.0.0:8080");

    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
            tracing::info!("Shutdown signal received");
        })
        .await?;

    Ok(())
}
