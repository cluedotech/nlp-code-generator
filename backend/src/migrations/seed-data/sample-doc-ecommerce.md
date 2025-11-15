# E-commerce System Documentation

## Overview

This is a comprehensive e-commerce platform database that manages customers, products, orders, and order items.

## Business Rules

### Customer Management
- Each customer must have a unique email address
- Customer phone numbers are optional
- Customer accounts are created upon first order

### Product Management
- Each product must have a unique SKU (Stock Keeping Unit)
- Products are organized by categories
- Stock quantity must be tracked for inventory management
- Prices are stored with 2 decimal precision

### Order Processing
- Orders go through the following statuses:
  - `pending`: Order placed but not yet processed
  - `processing`: Order is being prepared
  - `shipped`: Order has been shipped
  - `delivered`: Order delivered to customer
  - `cancelled`: Order was cancelled

- Order total amount is calculated from order items
- Each order must have both shipping and billing addresses

### Order Items
- Each order item links to a specific product
- Unit price is captured at time of order (may differ from current product price)
- Subtotal is calculated as quantity × unit_price

## Common Queries

### Get customer order history
```sql
SELECT o.order_id, o.order_date, o.status, o.total_amount
FROM orders o
WHERE o.customer_id = ?
ORDER BY o.order_date DESC;
```

### Get products by category
```sql
SELECT product_id, name, price, stock_quantity
FROM products
WHERE category = ?
ORDER BY name;
```

### Get order details with items
```sql
SELECT o.order_id, o.order_date, o.status, 
       oi.product_id, p.name, oi.quantity, oi.unit_price, oi.subtotal
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.order_id = ?;
```

## Integration Points

### Payment Processing
- Orders are created with status 'pending' until payment is confirmed
- Payment gateway webhooks update order status to 'processing'

### Inventory Management
- Stock quantity is decremented when order is placed
- Stock is restored if order is cancelled

### Shipping Integration
- Shipping address is used to calculate shipping costs
- Tracking numbers are stored in order metadata
