# Configuración Rápida para Vercel

## Variables de Entorno Requeridas

Para que la aplicación funcione correctamente en Vercel, necesitas configurar estas variables de entorno:

### 1. Ve al Dashboard de Vercel
- Abre [vercel.com](https://vercel.com)
- Ve a tu proyecto `inventory-app`
- Settings → Environment Variables

### 2. Añade estas Variables

```
RESEND_API_KEY=re_tu_api_key_aqui
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

### 3. Obtener API Key de Resend

1. Ve a [resend.com](https://resend.com)
2. Crea una cuenta gratuita
3. Ve a API Keys → Create API Key
4. Copia la key que empiece con `re_`

### 4. Configurar Dominio (Opcional)

Para enviar emails desde tu dominio:

1. En Resend: Domains → Add Domain
2. Sigue las instrucciones para verificar tu dominio
3. Actualiza el `from` email en `lib/services/email.ts`

### 5. Redeploy

Después de añadir las variables:
- Ve a Deployments
- Haz clic en "Redeploy" en el último deployment

## Variables Completas

Tu proyecto debería tener estas variables en Vercel:

```
NEXT_PUBLIC_INVAPPSUPABASE_URL=https://xwfbunljlevcwazzpmlj.supabase.co
NEXT_PUBLIC_INVAPPSUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

## Nota Importante

- Sin `RESEND_API_KEY`: Las invitaciones se crean pero no se envían emails
- Con `RESEND_API_KEY`: Las invitaciones se crean Y se envían emails automáticamente
