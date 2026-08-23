"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function WavyPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geomRef = useRef<THREE.PlaneGeometry>(null);

  const { positions, originalPositions } = useMemo(() => {
    const geom = new THREE.PlaneGeometry(30, 30, 60, 60);
    const pos = geom.attributes.position.array as Float32Array;
    const origPos = new Float32Array(pos.length);
    origPos.set(pos);
    return { positions: pos, originalPositions: origPos };
  }, []);

  useFrame((state) => {
    if (!geomRef.current) return;
    const time = state.clock.getElapsedTime() * 0.5;

    for (let i = 0; i < positions.length; i += 3) {
      const x = originalPositions[i];
      const y = originalPositions[i + 1];
      
      // Complex wave math for organic feel
      const z = 
        Math.sin(x * 0.2 + time) * 1.5 + 
        Math.cos(y * 0.3 + time * 0.8) * 1.5 +
        Math.sin((x + y) * 0.1 - time * 0.5) * 2;
        
      positions[i + 2] = z;
    }
    
    geomRef.current.attributes.position.needsUpdate = true;
    geomRef.current.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.5, 0, 0]} position={[0, -2, -5]}>
      <planeGeometry ref={geomRef} args={[30, 30, 60, 60]} />
      <meshStandardMaterial 
        color="#FF7A33" 
        wireframe 
        transparent 
        opacity={0.15} 
        emissive="#FF7A33"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}

export function AbstractMeshBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 2, 10], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <WavyPlane />
      </Canvas>
    </div>
  );
}
