import React, { useEffect, useRef } from 'react';

const ParticleBackground = () => {
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    const initVanta = () => {
      // Check if scripts have loaded globally
      if (window.VANTA && window.VANTA.BIRDS && !vantaEffect.current) {
        vantaEffect.current = window.VANTA.BIRDS({
          el: vantaRef.current,
          THREE: window.THREE,       // Explicitly pass three.js instance
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          // Integrate elegant colors matching the theme
          backgroundColor: 0xffffff, // White to match light theme
          color1: 0xff0055,          // Neon Pink/Red
          color2: 0x0088ff,          // Deep Blue/Cyan
          colorMode: "variance",
          quantity: 2.0,             // Lower quantity
          separation: 100.0,         // Spread birds apart
          cohesion: 10.0,            // Prevent clustering
          birdSize: 1.5
        });
      }
    };

    if (window.VANTA) {
      initVanta();
    } else {
      // Wait for scripts to load if React mounts faster than CDN
      const interval = setInterval(() => {
        if (window.VANTA) {
          initVanta();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }

    return () => {
      if (vantaEffect.current) {
        try { vantaEffect.current.destroy(); } catch (e) { console.error(e) }
        vantaEffect.current = null;
      }
    };
  }, []);

  // Update background color when dark mode toggle changes
  // We can listen to the [data-theme='dark'] attribute change
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (vantaEffect.current) {
        vantaEffect.current.setOptions({
          backgroundColor: isDark ? 0x050508 : 0xffffff
        });
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={vantaRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none', // Prevent the canvas from blocking UI clicks
      }}
    />
  );
};

export default ParticleBackground;
