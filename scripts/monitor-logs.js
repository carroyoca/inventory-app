const { exec } = require('child_process')

console.log('🔍 === MONITORING VERCEL LOGS ===')
console.log('📱 Now go to your browser and:')
console.log('1. Open: https://inventory-dklfxsp9m-carlos-arroyos-projects.vercel.app')
console.log('2. Login to your account')
console.log('3. Go to Users page')
console.log('4. Try to send an invitation')
console.log('5. Try to accept an invitation')
console.log('6. Watch the logs below...\n')

// Start monitoring logs
const child = exec('vercel logs https://inventory-dklfxsp9m-carlos-arroyos-projects.vercel.app --follow', {
  maxBuffer: 1024 * 1024 * 10 // 10MB buffer
})

child.stdout.on('data', (data) => {
  console.log('📋 LOG:', data.toString())
})

child.stderr.on('data', (data) => {
  console.log('❌ ERROR:', data.toString())
})

child.on('close', (code) => {
  console.log(`🔚 Log monitoring stopped with code ${code}`)
})

// Stop monitoring after 5 minutes
setTimeout(() => {
  console.log('⏰ Stopping log monitoring after 5 minutes...')
  child.kill()
  process.exit(0)
}, 5 * 60 * 1000)

console.log('⏰ Log monitoring will stop automatically in 5 minutes')
console.log('Press Ctrl+C to stop manually\n')
