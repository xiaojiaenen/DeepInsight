import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Sphere, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { editorOpenFile } from '../../lib/editorBus';

const Agent = ({ position }: { position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 5) * 0.1 + 0.5;
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        editorOpenFile({ path: 'rl_agent.py', lineNumber: 25 });
      }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={0.5} />
    </mesh>
  );
};

const Environment = () => {
  return (
    <group>
      {/* 奖励目标 */}
      <Box 
        position={[3, 0.5, 3]} 
        args={[0.8, 0.8, 0.8]}
        onClick={(e) => {
          e.stopPropagation();
          editorOpenFile({ path: 'environment.py', lineNumber: 50 });
        }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
      >
        <meshStandardMaterial color="#10b981" />
      </Box>
      {/* 障碍物 */}
      <Box position={[-1, 0.5, 1]} args={[1, 1, 1]}>
        <meshStandardMaterial color="#ef4444" />
      </Box>
      <Box position={[1, 0.5, -2]} args={[1, 1, 1]}>
        <meshStandardMaterial color="#ef4444" />
      </Box>
      <Grid infiniteGrid fadeDistance={20} cellColor="#cbd5e1" sectionColor="#94a3b8" />
    </group>
  );
};

export const RLVisualizer: React.FC = () => {
  const [stats, setStats] = useState({
    episode: 124,
    reward: 42.5,
    epsilon: 0.15,
    steps: 12
  });

  const links = [
    { label: 'Policy Net', path: 'rl_agent.py', line: 10 },
    { label: 'Target Net', path: 'rl_agent.py', line: 15 },
    { label: 'Experience Replay', path: 'utils/replay.py', line: 1 },
    { label: 'Reward Function', path: 'environment.py', line: 30 },
  ];

  return (
    <div className="w-full h-full bg-slate-100 relative">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-white/80 backdrop-blur p-3 rounded-lg border border-slate-200 shadow-sm">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">RL Environment</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-[10px] text-slate-500">Episode:</span>
            <span className="text-[10px] font-mono text-indigo-600">{stats.episode}</span>
            <span className="text-[10px] text-slate-500">Reward:</span>
            <span className="text-[10px] font-mono text-emerald-600">+{stats.reward}</span>
            <span className="text-[10px] text-slate-500">Epsilon:</span>
            <span className="text-[10px] font-mono text-amber-600">{stats.epsilon}</span>
            <span className="text-[10px] text-slate-500">Steps:</span>
            <span className="text-[10px] font-mono text-slate-600">{stats.steps}</span>
          </div>
        </div>
      </div>

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 8, 8]} />
        <color attach="background" args={['#f1f5f9']} />
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
        <Environment />
        <Agent position={[0, 0.5, 0]} />
        <OrbitControls makeDefault />
      </Canvas>

      <div className="absolute bottom-4 left-4 right-4 z-10 flex gap-2 overflow-x-auto no-scrollbar">
        {links.map(link => (
          <button 
            key={link.label} 
            onClick={() => editorOpenFile({ path: link.path, lineNumber: link.line })}
            className="px-3 py-1 bg-white/80 backdrop-blur border border-slate-200 rounded-full text-[10px] text-slate-600 whitespace-nowrap hover:bg-white hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
            {link.label}
          </button>
        ))}
      </div>
    </div>
  );
};
