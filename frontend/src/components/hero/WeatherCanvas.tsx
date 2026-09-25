import React, { useEffect, useRef } from 'react';

export interface WeatherCanvasProps {
  condition: string;
  temperature: number;
  windSpeed?: number;
  humidity?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  length?: number;
  phase?: number;
  speed?: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export const WeatherCanvas: React.FC<WeatherCanvasProps> = ({
  condition,
  temperature,
  windSpeed = 8,
  humidity = 60,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(canvas);

    // Weather type detection
    const cond = condition.toLowerCase();
    const isThunder = cond.includes('thunder') || cond.includes('storm');
    const isRain = isThunder || cond.includes('rain') || cond.includes('drizzle');
    const isSnow = cond.includes('snow') || cond.includes('sleet') || cond.includes('blizzard');
    const isFog = cond.includes('fog') || cond.includes('mist') || cond.includes('haze') || cond.includes('smoke');
    const isClouds = !isRain && !isSnow && !isFog && (cond.includes('cloud') || cond.includes('overcast'));
    const isClear = !isRain && !isSnow && !isFog && !isClouds;

    // Wind vector calculation
    const windAngle = Math.min(Math.max((windSpeed - 5) * 0.04, -0.4), 0.4);

    // Particle pools
    const particles: Particle[] = [];
    const ripples: Ripple[] = [];
    let particleCount = 45;

    if (isRain) {
      particleCount = isThunder ? 110 : 70;
    } else if (isSnow) {
      particleCount = 50;
    } else if (isFog) {
      particleCount = 18;
    } else if (isClouds) {
      particleCount = 20;
    } else {
      particleCount = 40; // Clear starry / solar dust
    }

    for (let i = 0; i < particleCount; i++) {
      if (isRain) {
        particles.push({
          x: Math.random() * (width + 100) - 50,
          y: Math.random() * height,
          vx: Math.tan(windAngle) * (isThunder ? 16 : 11),
          vy: (isThunder ? 14 : 9) + Math.random() * 5,
          size: 1 + Math.random() * 1.2,
          length: 12 + Math.random() * 16,
          alpha: 0.25 + Math.random() * 0.4,
        });
      } else if (isSnow) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.random() * 1 - 0.5,
          vy: 0.8 + Math.random() * 1.4,
          size: 1.5 + Math.random() * 2.5,
          alpha: 0.3 + Math.random() * 0.5,
          phase: Math.random() * Math.PI * 2,
          speed: 0.02 + Math.random() * 0.03,
        });
      } else if (isFog || isClouds) {
        particles.push({
          x: Math.random() * width,
          y: isFog ? height * 0.4 + Math.random() * (height * 0.6) : Math.random() * (height * 0.7),
          vx: 0.15 + (windSpeed / 50) * 0.3,
          vy: 0,
          size: 60 + Math.random() * 90,
          alpha: (isFog ? 0.05 : 0.07) + Math.random() * 0.06,
        });
      } else {
        // Clear stars / sun dust
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          size: 0.8 + Math.random() * 1.8,
          alpha: 0.2 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2,
          speed: 0.02 + Math.random() * 0.03,
        });
      }
    }

    // Lightning state
    let lightningOpacity = 0;
    let nextLightning = Date.now() + 3000 + Math.random() * 6000;

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // Handle lightning for thunderstorms
      if (isThunder) {
        const now = Date.now();
        if (now > nextLightning) {
          lightningOpacity = 0.35 + Math.random() * 0.3;
          nextLightning = now + 4000 + Math.random() * 7000;
        }
        if (lightningOpacity > 0.01) {
          ctx.fillStyle = `rgba(216, 235, 255, ${lightningOpacity})`;
          ctx.fillRect(0, 0, width, height);
          lightningOpacity *= 0.88;
        }
      }

      // Draw sun ray bloom if clear and warm
      if (isClear && temperature > 15) {
        const sunGrad = ctx.createRadialGradient(width * 0.85, 0, 0, width * 0.85, 0, width * 0.6);
        sunGrad.addColorStop(0, 'rgba(251, 191, 36, 0.12)');
        sunGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.04)');
        sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Render ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rip = ripples[i];
        rip.radius += 24 * dt;
        rip.alpha *= 0.92;

        ctx.beginPath();
        ctx.ellipse(rip.x, rip.y, rip.radius, rip.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(186, 230, 253, ${rip.alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        if (rip.alpha < 0.02 || rip.radius > rip.maxRadius) {
          ripples.splice(i, 1);
        }
      }

      // Render & update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (isRain) {
          p.x += p.vx * 60 * dt;
          p.y += p.vy * 60 * dt;

          const len = p.length || 16;
          const endX = p.x + Math.sin(windAngle) * len;
          const endY = p.y + Math.cos(windAngle) * len;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = `rgba(147, 197, 253, ${p.alpha})`;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.stroke();

          // Bottom boundary splash
          if (p.y > height - 5) {
            if (ripples.length < 25 && Math.random() < 0.3) {
              ripples.push({
                x: p.x,
                y: height - 2,
                radius: 1,
                maxRadius: 6 + Math.random() * 6,
                alpha: 0.3,
              });
            }
            p.y = -20;
            p.x = Math.random() * (width + 100) - 50;
          }
        } else if (isSnow) {
          p.phase = (p.phase || 0) + (p.speed || 0.02);
          p.x += Math.sin(p.phase) * 0.8 + p.vx;
          p.y += p.vy * 60 * dt;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.fill();

          if (p.y > height) {
            p.y = -5;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
        } else if (isFog || isClouds) {
          p.x += p.vx * 30 * dt;

          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          const col = isFog ? '203, 213, 225' : '148, 163, 184';
          grad.addColorStop(0, `rgba(${col}, ${p.alpha})`);
          grad.addColorStop(0.7, `rgba(${col}, ${p.alpha * 0.4})`);
          grad.addColorStop(1, `rgba(${col}, 0)`);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          if (p.x - p.size > width) {
            p.x = -p.size;
          }
        } else {
          // Clear / Night Stars / Warm Solar Particles
          p.phase = (p.phase || 0) + (p.speed || 0.02);
          const currentAlpha = Math.max(0.1, p.alpha * (0.6 + 0.4 * Math.sin(p.phase)));

          p.x += p.vx * 30 * dt;
          p.y += p.vy * 30 * dt;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = temperature > 18 ? `rgba(253, 224, 71, ${currentAlpha})` : `rgba(224, 231, 255, ${currentAlpha})`;
          ctx.fill();

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [condition, temperature, windSpeed, humidity]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    />
  );
};
