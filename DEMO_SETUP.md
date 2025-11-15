# Demo Setup Guide

This guide will help you populate the NLP Code Generator with sample data for demonstration purposes.

## Prerequisites

- All services running (`docker-compose ps` should show all services as healthy/up)
- LLM API key configured in `.env` file
- Access to the application at https://localhost

## Option 1: Automatic Seeding (Recommended)

Run the seed script to automatically create sample versions with DDL files and documentation:

```bash
# Restart backend with updated build
docker-compose stop backend
docker-compose rm -f backend
docker-compose up -d backend

# Wait for backend to be ready (about 30 seconds)
sleep 30

# Run the seed script
docker exec nlp-backend npm run seed:prod
```

This will create:
- **E-commerce v1.0**: Complete e-commerce database schema with customers, products, orders
- **HR System v1.0**: HR management system with employees, departments, attendance

## Option 2: Manual Setup via UI

If automatic seeding doesn't work (e.g., missing LLM API key), you can manually create demo data:

### Step 1: Login as Admin

1. Go to https://localhost
2. Login with:
   - Email: `admin@example.com`
   - Password: `admin123`

### Step 2: Create a Version

1. Click "Admin" in the navigation
2. In the Version Manager section, click "Create New Version"
3. Enter:
   - Name: `E-commerce v1.0`
   - Description: `E-commerce platform database schema`
4. Click "Create"

### Step 3: Upload DDL File

1. Select the newly created version from the dropdown
2. In the "Upload DDL File" section:
   - Click "Choose File"
   - Navigate to `backend/src/migrations/seed-data/`
   - Select `sample-ddl-ecommerce.sql`
   - Click "Upload DDL"

### Step 4: Upload Documentation

1. In the "Upload Supporting Documents" section:
   - Click "Choose Files"
   - Navigate to `backend/src/migrations/seed-data/`
   - Select `sample-doc-ecommerce.md`
   - Click "Upload Documents"

### Step 5: Repeat for HR System (Optional)

Repeat steps 2-4 with:
- Name: `HR System v1.0`
- Description: `Human Resources management system`
- DDL File: `sample-ddl-hr.sql`
- Documentation: `sample-doc-hr.md`

## Testing the Demo

### Generate SQL Query

1. Click "Generator" in the navigation
2. Select version: `E-commerce v1.0`
3. Select output type: `SQL`
4. Enter request: `Get all orders for a specific customer with their order items and product details`
5. Click "Generate"

### Expected Result

The system will generate a SQL query like:
```sql
SELECT 
  o.order_id,
  o.order_date,
  o.status,
  o.total_amount,
  oi.quantity,
  oi.unit_price,
  p.name AS product_name,
  p.description AS product_description
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.customer_id = ?
ORDER BY o.order_date DESC;
```

### More Demo Queries

Try these natural language requests:

**E-commerce v1.0**:
- "Get all products in a specific category with stock levels"
- "Find customers who placed orders in the last 30 days"
- "Calculate total revenue by product category"
- "Get pending orders with customer contact information"

**HR System v1.0**:
- "List all employees in a specific department"
- "Find employees hired in the last year"
- "Get attendance records for an employee"
- "Calculate average salary by department"

### Generate n8n Workflow

1. Select output type: `n8n`
2. Enter request: `Create a workflow that sends an email notification when a new order is placed`
3. Click "Generate"

### Generate Form.io Form

1. Select output type: `Form.io`
2. Enter request: `Create a customer registration form with name, email, phone, and address fields`
3. Click "Generate"

## View Request History

1. Click "History" in the navigation
2. See all your previous generation requests
3. Click on any request to view details
4. Use the "Resubmit" button to regenerate with modifications

## Admin Features to Demo

### Version Management
- Create multiple versions for different software releases
- Update version descriptions
- Delete old versions

### File Management
- View all uploaded files for a version
- Download DDL files
- Delete files
- Upload multiple documentation files at once

### Cache Management
- Warm cache for frequently used versions (faster generation)
- Invalidate cache when files are updated

## Troubleshooting

### Seed Script Fails

If the automatic seeding fails:
1. Check LLM API key is set: `docker exec nlp-backend env | grep LLM_API_KEY`
2. Check backend logs: `docker logs nlp-backend`
3. Use Manual Setup (Option 2) instead

### Generation Takes Too Long

- First generation for a version may take 10-20 seconds (building embeddings)
- Subsequent generations should be faster (2-5 seconds)
- Check backend logs for errors: `docker logs nlp-backend -f`

### No Results Generated

- Ensure DDL files and documentation are uploaded
- Check that the version is selected
- Verify LLM API key is valid
- Check backend health: `curl http://localhost:3000/health/ready`

## Sample Data Files

The sample data files are located in:
```
backend/src/migrations/seed-data/
├── sample-ddl-ecommerce.sql      # E-commerce database schema
├── sample-doc-ecommerce.md       # E-commerce documentation
├── sample-ddl-hr.sql             # HR system database schema
└── sample-doc-hr.md              # HR system documentation
```

You can create your own sample files following the same format!

## Next Steps

After the demo:
1. Change the default admin password
2. Create additional user accounts for team members
3. Upload your actual database schemas
4. Configure production LLM settings
5. Set up regular backups (see DEPLOYMENT.md)

Enjoy your demo!
