// Simple connectivity check to Supabase using service role key
// Usage: node scripts/check-supabase-connectivity.js
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_INVAPPSUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

async function main() {
  if (!url || !key) {
    console.error('Missing Supabase env vars. URL or SERVICE_ROLE_KEY not set.')
    process.exit(1)
  }
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  // Try a safe, tiny query
  const { count, error } = await supabase
    .from('inventory_items')
    .select('id', { count: 'exact', head: true })

  if (error) {
    console.error('Connectivity check failed:', error)
    process.exit(2)
  }
  console.log('✅ Supabase connectivity OK. Inventory item count (approx):', count ?? 'unknown')
}

main()

