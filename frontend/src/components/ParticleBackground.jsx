import React, { useEffect, useRef } from 'react';

const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let particles = [];

    // Wave parameters defining the dot grid
    const xSpacing = 45;
    const zSpacing = 45;
    const cols = 45;
    const rows = 35;

    // Interactive mouse tracking
    let mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Particle {
      constructor(ix, iz) {
        this.ix = ix;
        this.iz = iz;
        // Base 3D space
        this.baseX = (ix - cols / 2) * xSpacing;
        this.baseZ = iz * zSpacing;
        this.y = 0;

        // Horizontal color mapping perfectly matching Antigravity aesthetics
        const t = ix / cols;
        const r = Math.floor(t * 236 + (1 - t) * 66);
        const g = Math.floor(t * 72 + (1 - t) * 133);
        const b = Math.floor(t * 153 + (1 - t) * 244);

        this.color = `rgb(${r}, ${g}, ${b})`;
      }

      update(time) {
        // Smooth sine wave ripples generating the water effect
        this.y = Math.sin(this.ix * 0.3 + time) * 35;
        this.y += Math.cos(this.iz * 0.2 + time * 0.8) * 35;
      }

      draw(cx, cy) {
        const fov = 300;
        const viewZ = this.baseZ + 150;

        if (viewZ <= 0) return;

        const scale = fov / viewZ;
        let screenX = cx + this.baseX * scale;
        let screenY = cy + (this.y + 120) * scale;

        let size = Math.max(0.7, 3 * scale);

        // Geometric Cursor Reaction: Push dots away fluidly like a magnet!
        const dx = screenX - mouse.x;
        const dy = screenY - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const interactionRadius = 130;

        if (distance < interactionRadius) {
          const force = (interactionRadius - distance) / interactionRadius;
          const forceX = (dx / distance) * force * 40;
          const forceY = (dy / distance) * force * 40;

          screenX += forceX;
          screenY += forceY;
          size += force * 2.5; // Dots swell beautifully as they repel
        }

        // Depth-based opacity fading naturally into the horizon
        const opacity = Math.max(0, Math.min(1, 1 - (this.baseZ / (rows * zSpacing))));

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const init = () => {
      particles = [];
      for (let ix = 0; ix < cols; ix++) {
        for (let iz = 0; iz < rows; iz++) {
          particles.push(new Particle(ix, iz));
        }
      }
    };

    const animate = (timeRaw) => {
      const time = timeRaw * 0.0015;
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

      // Crisp minimal background color
      ctx.fillStyle = isDark ? '#050508' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height * 0.45;

      particles.forEach(p => {
        p.update(time);
        p.draw(cx, cy);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
};

export default ParticleBackground;
