"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.OrthographicCamera | null;
    renderer: THREE.WebGLRenderer | null;
    mesh: THREE.Mesh | null;
    uniforms: {
      resolution: { value: THREE.Vector2 };
      time: { value: number };
      xScale: { value: number };
      yScale: { value: number };
      distortion: { value: number };
    } | null;
    animationId: number | null;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    mesh: null,
    uniforms: null,
    animationId: null,
  });

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const { current: refs } = sceneRef;

    const vertexShader = `
      attribute vec3 position;
      void main() { gl_Position = vec4(position, 1.0); }
    `;
    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;
      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        float d = length(p) * distortion;
        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);
        float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });

    const uniforms = {
      resolution: { value: new THREE.Vector2(1, 1) },
      time: { value: 0 },
      xScale: { value: 3.0 },
      yScale: { value: 0.2 },
      distortion: { value: 0.15 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    refs.scene = scene;
    refs.camera = camera;
    refs.renderer = renderer;
    refs.mesh = mesh;
    refs.uniforms = uniforms;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      uniforms.resolution.value.set(w, h);
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = (t: number) => {
      refs.animationId = requestAnimationFrame(animate);
      uniforms.time.value = t * 0.001;
      renderer.render(scene, camera);
    };
    refs.animationId = requestAnimationFrame(animate);

    return () => {
      if (refs.animationId !== null) {
        cancelAnimationFrame(refs.animationId);
      }
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      refs.scene = null;
      refs.camera = null;
      refs.renderer = null;
      refs.mesh = null;
      refs.uniforms = null;
      refs.animationId = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed left-0 top-0 z-0 block h-full w-full"
      aria-hidden
    />
  );
}
