CREATE TABLE IF NOT EXISTS payments (
    correlation_id uuid PRIMARY KEY,
    amount decimal(10, 2) NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payment_processor VARCHAR(10) NOT NULL
);