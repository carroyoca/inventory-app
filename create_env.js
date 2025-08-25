const fs = require('fs');

const envContent = `# Supabase Configuration
NEXT_PUBLIC_INVAPPSUPABASE_URL=https://xwfbunljlevcwazzpmlj.supabase.co
NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MzkyOTgsImV4cCI6MjA3MTUxNTI5OH0.eW44Jz115sX-omrQfQv-28xy-WlEJ7e5XKKbHiAs6dQ

# Redirect URL for development
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback

# Service role key for server-side operations
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkzOTI5OCwiZXhwIjoyMDcxNTE1Mjk4fQ.W_oJijT7HuwQB07i-061eZe7E8DTOchIGx8FWAJk3A8

# Vercel Blob for file uploads
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_1234567890abcdef
`;

fs.writeFileSync('.env.local', envContent);
console.log('.env.local file created successfully');
