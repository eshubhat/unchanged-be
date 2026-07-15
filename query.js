const { Client } = require('pg');
const c = new Client('postgresql://postgres:eshan@localhost:5433/ecommerce');
c.connect()
  .then(() => c.query('SELECT id, order_number, status, payment_status, created_at, updated_at FROM orders ORDER BY created_at DESC LIMIT 5'))
  .then((r) => { console.log(r.rows); c.end(); })
  .catch((e) => { console.error(e); c.end(); });
