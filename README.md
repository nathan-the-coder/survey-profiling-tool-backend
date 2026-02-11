# Survey Profiling Backend - Dual Database Setup

This backend supports both MySQL (development) and Supabase (production) databases.

## Setup Instructions

### 1. Environment Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Update your `.env` file with your database credentials:
```env
# Development (MySQL)
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=user_db

# Production (Supabase)
SUPABASE_URL=https://rjhicbmpgziwrzkojvkp.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### 2. Supabase Setup

1. Go to your Supabase project: https://rjhicbmpgziwrzkojvkp.supabase.co
2. Navigate to the SQL Editor
3. Run the contents of `supabase-setup.sql` to enable raw SQL execution
4. Create your tables in Supabase (same schema as your MySQL database)

### 3. Local Development (MySQL)

Make sure your MySQL server is running and the database `user_db` exists:

```sql
CREATE DATABASE IF NOT EXISTS user_db;
```

Then start the development server:

```bash
npm run dev
```

### 4. Production (Supabase)

Set `NODE_ENV=production` in your environment or use:

```bash
npm run start
```

### 5. Required Tables

Ensure your Supabase database has these tables with the same schema as your MySQL database:

- `users`
- `households`
- `family_members`
- `health_conditions`
- `socio_economic`

### Database Switching Logic

- **Development**: Uses MySQL (localhost)
- **Production**: Uses Supabase (https://rjhicbmpgziwrzkojvkp.supabase.co)
- The switch is automatic based on `NODE_ENV` environment variable

### Testing the Setup

1. Test MySQL connection (development):
```bash
NODE_ENV=development npm run dev
```

2. Test Supabase connection (production):
```bash
NODE_ENV=production npm run start
```

### Important Notes

- Make sure your Supabase tables match the MySQL schema exactly
- The database abstraction layer handles SQL syntax differences automatically
- All database operations work the same way regardless of the underlying database
- Transactions are supported in MySQL and simulated in Supabase

### Getting Your Supabase Keys

1. In Supabase, go to Project Settings > API
2. Copy the Project URL (already set: https://rjhicbmpgziwrzkojvkp.supabase.co)
3. Copy the `anon` public key and `service_role` key
4. Add them to your `.env` file

### Troubleshooting

- If Supabase queries fail, make sure the SQL function was created
- Check that your Supabase tables exist and have the correct structure
- Verify your API keys have proper permissions
- Check the console logs for database connection messages