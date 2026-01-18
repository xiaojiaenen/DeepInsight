import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import * as THREE from 'three';
import { editorOpenFile } from '../../lib/editorBus';

const PointCloud = () => {
  const points = useMemo(() => {
    const p = [];
    for (let i = 0; i < 500; i++) {
      const x = (Math.random() - 0.5) * 10;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 10;
      const color = new THREE.Color();
      // 模拟聚类效果
      if (x > 0 && y > 0) color.set('#6366f1'); // Indigo
      else if (x < 0 && y > 0) color.set('#ec4899'); // Pink
      else color.set('#10b981'); // Emerald
      
      p.push({ pos: [x, y, z], color });
    }
    return p;
  }, []);

  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002;
    }
  });

  return (
    <group ref={groupRef}>
      {points.map((p, i) => (
        <mesh 
          key={i} 
          position={p.pos as [number, number, number]}
          onClick={(e) => {
            e.stopPropagation();
            editorOpenFile({ path: 'dataset.py', lineNumber: 20 });
          }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'default'; }}
        >
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
};

export const MLVisualizer: React.FC = () => {
  return (
    <div className="w-full h-full bg-slate-900">
      <div className="absolute top-4 left-4 z-10 text-white flex flex-col gap-1">
        <h4 className="text-xs font-bold uppercase tracking-widest opacity-50">Feature Space</h4>
        <p className="text-[10px] opacity-70">UMAP Projection of Training Data</p>
        <button 
          onClick={() => editorOpenFile({ path: 'preprocessing.py', lineNumber: 1 })}
          className="mt-2 text-[9px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 pointer-events-auto"
        >
          <span className="w-1 h-1 bg-indigo-400 rounded-full" />
          VIEW PREPROCESSING
        </button>
      </div>
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <PointCloud />
        <OrbitControls autoRotate autoRotateSpeed={0.5} enablePan={false} />
      </Canvas>
      <div className="absolute bottom-4 right-4 z-10 flex gap-4 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-[10px] text-white opacity-60">Cluster A</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-pink-500" />
          <span className="text-[10px] text-white opacity-60">Cluster B</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-white opacity-60">Cluster C</span>
        </div>
      </div>
    </div>
  );
};
