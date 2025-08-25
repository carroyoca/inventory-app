# Configuración de Variables de Entorno para Email

Para que el sistema de invitaciones por email funcione correctamente, necesitas configurar las siguientes variables de entorno:

## 1. Resend API Key

1. Ve a [resend.com](https://resend.com) y crea una cuenta
2. Obtén tu API key desde el dashboard
3. Añade esta variable a tu `.env.local`:

```bash
RESEND_API_KEY=re_tu_api_key_aqui
```

## 2. App URL

Añade la URL de tu aplicación para que los enlaces de email funcionen:

```bash
# Para desarrollo local
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Para producción (reemplaza con tu dominio)
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

## 3. Variables Completas

Tu archivo `.env.local` debería verse así:

```bash
# Supabase Configuration
NEXT_PUBLIC_INVAPPSUPABASE_URL=https://xwfbunljlevcwazzpmlj.supabase.co
NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MzkyOTgsImV4cCI6MjA3MTUxNTI5OH0.eW44Jz115sX-omrQfQv-28xy-WlEJ7e5XKKbHiAs6dQ

# Redirect URL for development
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback

# Service role key for server-side operations
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3ZmJ1bmxqbGV2Y3dhenpwbWxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTkzOTI5OCwiZXhwIjoyMDcxNTE1Mjk4fQ.W_oJijT7HuwQB07i-061eZe7E8DTOchIGx8FWAJk3A8

# Vercel Blob for file uploads
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_1234567890abcdef

# Resend for email notifications
RESEND_API_KEY=re_tu_api_key_aqui

# App URL for email links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 4. Configuración en Vercel

Si estás desplegando en Vercel, también necesitas añadir estas variables en el dashboard de Vercel:

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Añade:
   - `RESEND_API_KEY`
   - `NEXT_PUBLIC_APP_URL`

## 5. Dominio Verificado en Resend

Para enviar emails desde tu aplicación, necesitas verificar un dominio en Resend:

1. Ve al dashboard de Resend
2. Domains → Add Domain
3. Sigue las instrucciones para verificar tu dominio
4. Una vez verificado, actualiza el `from` email en `lib/services/email.ts`
