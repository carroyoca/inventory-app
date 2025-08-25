import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 === EMAIL TEST START ===')
    
    // Check environment variables
    const resendApiKey = process.env.RESEND_API_KEY
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    
    console.log('📧 Environment check:')
    console.log('- RESEND_API_KEY:', resendApiKey ? '✅ Set' : '❌ Missing')
    console.log('- NEXT_PUBLIC_APP_URL:', appUrl || '❌ Missing')
    
    if (!resendApiKey) {
      return NextResponse.json({
        success: false,
        error: 'RESEND_API_KEY not configured',
        message: 'Please add RESEND_API_KEY to your environment variables'
      })
    }
    
    // Test Resend client creation
    const resend = new Resend(resendApiKey)
    console.log('✅ Resend client created successfully')
    
    // Test a simple email (optional)
    try {
      const { data, error } = await resend.emails.send({
        from: 'Art Inventory <noreply@artinventory.com>',
        to: ['test@example.com'],
        subject: 'Test Email from Art Inventory',
        html: '<p>This is a test email to verify Resend configuration.</p>'
      })
      
      if (error) {
        console.log('❌ Email test failed:', error)
        return NextResponse.json({
          success: false,
          error: 'Email test failed',
          details: error
        })
      }
      
      console.log('✅ Email test successful:', data)
      return NextResponse.json({
        success: true,
        message: 'Email configuration is working',
        data
      })
      
    } catch (emailError) {
      console.log('❌ Email test error:', emailError)
      return NextResponse.json({
        success: false,
        error: 'Email test error',
        details: emailError
      })
    }
    
  } catch (error) {
    console.error('❌ Test endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test endpoint error',
      details: error
    })
  }
}
