export interface ConfettiOptions {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number, y?: number };
    colors?: string[];
}

export interface ConfettiOptions {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number, y?: number };
    colors?: string[];
    angle?: number;
    decay?: number;
    drift?: number;
    gravity?: number;
    scalar?: number;
    ticks?: number;
}

export function confetti(options: ConfettiOptions = {}): void {
    const {
        particleCount = 50,
        spread = 70,
        origin = { x: 0.5, y: 0.5 },
        colors = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981'],
        angle = 90,
        decay = 0.9,
        drift = 0,
        gravity = 1,
        scalar = 1
    } = options;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d')!;
    let particles: any[] = [];

    const resize = () => {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    window.addEventListener('resize', resize);
    resize();

    const radAngle = (angle * Math.PI) / 180;
    const radSpread = (spread * Math.PI) / 180;

    for (let i = 0; i < particleCount; i++) {
        const velocity = (25 + Math.random() * 20) * scalar;
        const pAngle = radAngle + (Math.random() - 0.5) * radSpread;

        particles.push({
            x: origin.x! * window.innerWidth,
            y: origin.y! * window.innerHeight,
            vx: Math.cos(pAngle) * velocity,
            vy: -Math.sin(pAngle) * velocity,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: (Math.random() * 8 + 4) * scalar,
            opacity: 1,
            wobble: Math.random() * 10,
            wobbleSpeed: 0.1 + Math.random() * 0.1,
            tilt: Math.random() * 10,
            tiltSpeed: 0.1 + Math.random() * 0.1,
            rotation: Math.random() * 2 * Math.PI,
            rotationSpeed: (Math.random() - 0.5) * 0.2
        });
    }

    const animate = () => {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        particles = particles.filter(p => p.opacity > 0 && p.y < window.innerHeight);

        particles.forEach(p => {
            p.vx *= decay;
            p.vy *= decay;
            p.vy += gravity * 0.5;
            p.vx += drift;

            p.x += p.vx;
            p.y += p.vy;

            p.wobble += p.wobbleSpeed;
            p.tilt += p.tiltSpeed;
            p.rotation += p.rotationSpeed;
            p.opacity -= 0.005;

            const x1 = p.x + p.size * Math.cos(p.rotation);
            const y1 = p.y + p.size * Math.sin(p.rotation);

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.scale(Math.cos(p.wobble), Math.sin(p.tilt));
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.opacity);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });

        if (particles.length > 0) {
            requestAnimationFrame(animate);
        } else {
            document.body.removeChild(canvas);
            window.removeEventListener('resize', resize);
        }
    };

    animate();
}
