"use client";
import { useEffect, useRef } from "react";

type Node = { x: number; y: number; vx: number; vy: number; r: number; gold: boolean };

/**
 * Animated constellation of "knowledge" nodes. Nearby nodes link up, and the
 * cursor acts as an extra node that pulls connections towards it.
 */
export default function KnowledgeNetwork({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: -9999, y: -9999, active: false };
    let nodes: Node[] = [];
    let width = 0, height = 0, frame = 0, visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, Math.max(32, (width * height) / 16000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.8,
        gold: Math.random() < 0.22,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const linkDist = Math.min(150, width / 7);
      for (const n of nodes) {
        if (!reduce) {
          // Gentle pull towards the cursor.
          if (pointer.active) {
            const dx = pointer.x - n.x, dy = pointer.y - n.y;
            const d = Math.hypot(dx, dy);
            if (d < 220 && d > 1) { n.vx += (dx / d) * 0.012; n.vy += (dy / d) * 0.012; }
          }
          n.vx = Math.max(-0.7, Math.min(0.7, n.vx * 0.995));
          n.vy = Math.max(-0.7, Math.min(0.7, n.vy * 0.995));
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > width) n.vx *= -1;
          if (n.y < 0 || n.y > height) n.vy *= -1;
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < linkDist) {
            ctx.strokeStyle = `rgba(120,160,255,${(1 - d / linkDist) * 0.22})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        if (pointer.active) {
          const d = Math.hypot(a.x - pointer.x, a.y - pointer.y);
          if (d < 180) {
            ctx.strokeStyle = `rgba(244,183,64,${(1 - d / 180) * 0.55})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = n.gold ? "rgba(244,183,64,.95)" : "rgba(170,195,255,.75)";
        ctx.beginPath(); ctx.arc(n.x, n.y, n.gold ? n.r + 0.6 : n.r, 0, Math.PI * 2); ctx.fill();
      }
      if (!reduce && visible) frame = requestAnimationFrame(draw);
    };

    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = pointer.y >= 0 && pointer.y <= rect.height;
      if (reduce) draw();
    };
    const onLeave = () => { pointer.active = false; };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(frame);
      if (visible) draw();
    });

    resize();
    draw();
    observer.observe(canvas);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={`pointer-events-none h-full w-full ${className}`} />;
}
