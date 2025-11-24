import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function NeonConstellation() {
  const pointsRef = useRef();
  const linesRef = useRef();
  const [mouse, setMouse] = useState([0, 0]);

  const count = 500; // increase for density
  const spread = 60; // increased spread for wider display
  const positions = new Float32Array(count * 3);
  const basePositions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    positions[ix] = basePositions[ix] = (Math.random() - 0.5) * spread;
    positions[ix + 1] = basePositions[ix + 1] = (Math.random() - 0.5) * spread * 0.6; // slightly shorter vertically
    positions[ix + 2] = basePositions[ix + 2] = (Math.random() - 0.5) * spread;

    velocities[ix] = (Math.random() - 0.5) * 0.02;
    velocities[ix + 1] = (Math.random() - 0.5) * 0.02;
    velocities[ix + 2] = (Math.random() - 0.5) * 0.02;
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMouse([
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      ]);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame(({ clock }) => {
    const lineDistance = 3.0; // allow lines to connect farther
    const positionsArray = pointsRef.current.geometry.attributes.position.array;

    // Animate points
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = ix + 1;
      const iz = ix + 2;

      positions[ix] += velocities[ix];
      positions[iy] += velocities[iy];
      positions[iz] += velocities[iz];

      for (let j = 0; j < 3; j++) {
        if (positions[ix + j] > spread / 2 || positions[ix + j] < -spread / 2) velocities[ix + j] *= -1;
      }

      positions[ix] += (mouse[0] * spread - positions[ix]) * 0.005;
      positions[iy] += (mouse[1] * spread * 0.6 - positions[iy]) * 0.005;

      positionsArray[ix] = positions[ix] + Math.sin(clock.getElapsedTime() + i) * 0.05;
      positionsArray[iy] = positions[iy] + Math.cos(clock.getElapsedTime() + i) * 0.05;
      positionsArray[iz] = positions[iz] + Math.sin(clock.getElapsedTime() * 0.5 + i) * 0.05;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Update lines
    const linePositions = linesRef.current.geometry.attributes.position.array;
    const lineColors = linesRef.current.geometry.attributes.color.array;
    let ptr = 0;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      for (let j = i + 1; j < count; j++) {
        const jx = j * 3;
        const dx = positions[ix] - positions[jx];
        const dy = positions[ix + 1] - positions[jx + 1];
        const dz = positions[ix + 2] - positions[jx + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < lineDistance) {
          linePositions[ptr * 3] = positions[ix];
          linePositions[ptr * 3 + 1] = positions[ix + 1];
          linePositions[ptr * 3 + 2] = positions[ix + 2];

          linePositions[ptr * 3 + 3] = positions[jx];
          linePositions[ptr * 3 + 4] = positions[jx + 1];
          linePositions[ptr * 3 + 5] = positions[jx + 2];

          const intensity = 1.0 - dist / lineDistance;
          const hue = ((clock.getElapsedTime() * 40 + i * 5) % 360) / 360;
          const color = new THREE.Color().setHSL(hue, 0.8, intensity * 0.5 + 0.25);

          lineColors[ptr * 6] = color.r;
          lineColors[ptr * 6 + 1] = color.g;
          lineColors[ptr * 6 + 2] = color.b;
          lineColors[ptr * 6 + 3] = color.r;
          lineColors[ptr * 6 + 4] = color.g;
          lineColors[ptr * 6 + 5] = color.b;

          ptr++;
        }
      }
    }

    linesRef.current.geometry.setDrawRange(0, ptr);
    linesRef.current.geometry.attributes.position.needsUpdate = true;
    linesRef.current.geometry.attributes.color.needsUpdate = true;
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color="#0ff" size={0.12} sizeAttenuation transparent opacity={0.9} />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={new Float32Array(count * count * 3 * 2)} count={count * count * 2} itemSize={3} />
          <bufferAttribute attach="attributes-color" array={new Float32Array(count * count * 3 * 2)} count={count * count * 2} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.5} />
      </lineSegments>
    </>
  );
}

export default function BackgroundAnimation() {
  return (
    <Canvas
      camera={{ position: [0, 0, 40], fov: 70 }}
      style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: -1 }}
    >
      <color attach="background" args={["#000"]} />
      <NeonConstellation />
    </Canvas>
  );
}
