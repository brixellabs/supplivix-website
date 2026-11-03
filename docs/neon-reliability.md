# Neon Serverless PostgreSQL Reliability & Disaster Recovery Runbook (Category M)

Status: Verified (Phase 10)  
Architecture: Neon Serverless PostgreSQL with PgBouncer Connection Pooling & Copy-on-Write Branching  
Invariant: Zero Data Loss, Whole PKR Integers, 100% Cash on Delivery (COD)

---

## 1. Connection Topology & Pooling (DB-04)

Neon provides two distinct connection endpoints for each database branch:
1. **Pooled Connection String (`-pooler` endpoint on Port 6543)**:
   - Used for normal application queries, HTTP requests, and background tasks.
   - Connects through Neon's built-in PgBouncer transaction pooler.
   - Multiplexes 100+ concurrent application connections onto a small footprint of PostgreSQL backends.
   - Configured with `conn_max_age=0` in Django settings so connections are closed and returned to the pool immediately upon request completion.
   - Prevents `too many connections` errors under high concurrent traffic (verified under 100 concurrent workers).
2. **Direct Connection String (Port 5432, without `-pooler`)**:
   - Used exclusively for migrations (`migrate`, `makemigrations`) via `DIRECT_DATABASE_URL`.
   - Bypasses PgBouncer transaction pooling to allow DDL statements, advisory locks, and table schema alterations.

```python
# backend/config/settings.py
is_migration = any(cmd in sys.argv for cmd in ['migrate', 'makemigrations'])
direct_url = os.environ.get('DIRECT_DATABASE_URL')
db_url = os.environ.get('DATABASE_URL')

selected_db_url = direct_url if (is_migration and direct_url) else (db_url or 'sqlite:///db.sqlite3')

DATABASES = {
    'default': dj_database_url.config(
        default=selected_db_url,
        conn_max_age=0 if '-pooler' in selected_db_url else 600,
        conn_health_checks=True,
        ssl_require=True if 'postgresql' in selected_db_url else False,
    )
}
```

---

## 2. Auto-Suspend Cold Start & Wake-Up Handling (DB-01)

When a Neon compute endpoint is idle, it automatically scales down to zero compute to conserve resources. On the first incoming connection, Neon wakes up the compute node (typically within 500ms to 2s).

To guarantee zero downtime and zero 500 errors to end users:
1. `health_check` endpoint in [backend/core/views.py](file:///d:/Brixellabs/supplivix/supplivix_website/backend/core/views.py) runs a `SELECT 1;` query with a 3-attempt exponential backoff retry.
2. `NeonAutoSuspendRetryMiddleware` in [backend/core/middleware.py](file:///d:/Brixellabs/supplivix/supplivix_website/backend/core/middleware.py) intercepts any `OperationalError` indicating server wake-up or connection loss, flushes stale connection pools, and retries the request with a brief 0.5s backoff. The request succeeds well within the 5-second SLA.

---

## 3. Database Migration Procedures (DB-02)

### On Fresh Database / Fresh Branch
```bash
python manage.py migrate
python manage.py seed_demo --force
```

### On Seeded Database / Schema Alteration
```bash
# Apply pending schema alterations using DIRECT_DATABASE_URL
python manage.py migrate
# Verify reversible backward migration
python manage.py migrate orders 0001
python manage.py migrate orders
```

---

## 4. Transactional Atomic Rollback (DB-03)

Every multi-step order placement runs inside `@transaction.atomic` in [backend/orders/services.py](file:///d:/Brixellabs/supplivix/supplivix_website/backend/orders/services.py).
If an unexpected crash, payment method invalidation, or exception occurs halfway through:
- Product stock decrement is rolled back to original levels.
- Coupon redemption record is rolled back; usage count is not incremented.
- Order and order items are never committed to disk.
- Cart items remain intact for the customer.

---

## 5. Point-In-Time Restore (PITR) & Branching Drill (DB-05)

Neon utilizes copy-on-write storage (Pageserver and Safekeepers) allowing instantaneous branching from any past timestamp.

### PITR Disaster Recovery Runbook
1. **Identify Recovery Timestamp ($T_{recovery}$)**:
   Note the UTC timestamp immediately preceding the incident or corruption:
   ```bash
   RECOVERY_TIMESTAMP="2026-11-03T11:00:00Z"
   ```
2. **Create Branch at Point-In-Time**:
   ```bash
   neonctl branches create \
     --project-id $NEON_PROJECT_ID \
     --name pitr-recovery-branch \
     --parent main \
     --timestamp $RECOVERY_TIMESTAMP
   ```
3. **Switch Environment Connection Strings**:
   Update `DATABASE_URL` and `DIRECT_DATABASE_URL` to point to `pitr-recovery-branch`.
4. **Run Verification Drill**:
   ```bash
   python manage.py neon_restore_drill --verify
   ```
5. **Verify Data Integrity**:
   Verify product counts (48), orders, user accounts, and coupons match pre-incident snapshot.

