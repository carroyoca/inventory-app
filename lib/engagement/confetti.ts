"use client"

// Lightweight confetti without external deps
// Inspired by common canvas particle examples; limited to short bursts
export function launchConfetti(durationMs = 1200) {
  if (typeof window === 'undefined') return
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) return

  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '9999'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    document.body.removeChild(canvas)
    return
  }

  let w = (canvas.width = window.innerWidth)
  let h = (canvas.height = window.innerHeight)

  const colors = ['#6366F1', '#22C55E', '#F59E0B', '#06B6D4', '#EF4444']
  const count = Math.min(160, Math.floor((w * h) / 50000))

  const particles: Array<{x:number;y:number;angle:number;velocity:number;size:number;color:string;life:number}> = []
  const now = performance.now()
  const end = now + durationMs

  for (let i = 0; i < count; i++) {
    particles.push({
      x: w * Math.random(),
      y: -20,
      angle: Math.PI * (Math.random() * 0.5 + 0.25),
      velocity: 4 + Math.random() * 5,
      size: 4 + Math.random() * 4,
      color: colors[i % colors.length],
      life: 0,
    })
  }

  const onResize = () => {
    w = canvas.width = window.innerWidth
    h = canvas.height = window.innerHeight
  }
  window.addEventListener('resize', onResize)

  function draw() {
    const t = performance.now()
    ctx.clearRect(0, 0, w, h)

    particles.forEach((p) => {
      p.life += 16
      p.x += Math.cos(p.angle) * p.velocity
      p.y += Math.sin(p.angle) * p.velocity + p.life * 0.0008 // slight gravity
      ctx.fillStyle = p.color
      ctx.fillRect(p.x, p.y, p.size, p.size)
    })

    if (t < end) {
      requestAnimationFrame(draw)
    } else {
      window.removeEventListener('resize', onResize)
      document.body.removeChild(canvas)
    }
  }

  requestAnimationFrame(draw)
}

