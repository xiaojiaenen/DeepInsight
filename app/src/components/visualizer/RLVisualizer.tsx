import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Sphere, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { editorOpenFile } from '../../lib/editorBus';
import { subscribeRuns } from '../../features/runs/runsStore';
import { Terminal } from 'lucide-react';

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
      <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
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
    episode: 0,
    reward: 0,
    epsilon: 1.0,
    steps: 0
  });
  const [agentPos, setAgentPos] = useState<[number, number, number]>([0, 0.5, 0]);
  const [isLive, setIsLive] = useState(false);
  const [showCommand, setShowCommand] = useState(false);

  // 监听真实运行指标
  useEffect(() => {
    return subscribeRuns((allRuns) => {
      const activeRun = allRuns.find(r => !r.finishedAt);
      if (!activeRun) {
        setIsLive(false);
        return;
      }
      setIsLive(true);

      const episode = activeRun.metrics.findLast(m => m.name === 'rl_episode')?.value as number;
      const reward = activeRun.metrics.findLast(m => m.name === 'rl_reward')?.value as number;
      const epsilon = activeRun.metrics.findLast(m => m.name === 'rl_epsilon')?.value as number;
      const steps = activeRun.metrics.findLast(m => m.name === 'rl_steps')?.value as number;
      const pos = activeRun.metrics.findLast(m => m.name === 'rl_pos')?.value;

      if (episode !== undefined) setStats(prev => ({ ...prev, episode }));
      if (reward !== undefined) setStats(prev => ({ ...prev, reward }));
      if (epsilon !== undefined) setStats(prev => ({ ...prev, epsilon }));
      if (steps !== undefined) setStats(prev => ({ ...prev, steps }));
      if (pos && Array.isArray(pos)) setAgentPos([pos[0], 0.5, pos[1]]);
    });
  }, []);

  const links = [
    { label: '策略网络 (Policy Net)', path: 'rl_agent.py', line: 10 },
    { label: '目标网络 (Target Net)', path: 'rl_agent.py', line: 15 },
    { label: '经验回放 (Replay)', path: 'utils/replay.py', line: 1 },
    { label: '奖励函数 (Reward)', path: 'environment.py', line: 30 },
  ];

  return (
    <div className="w-full h-full bg-slate-100 relative">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-white/80 backdrop-blur p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase">强化学习环境 (GridWorld)</h4>
            {isLive ? (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30 animate-pulse">
                LIVE
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 text-[9px] font-bold border border-slate-300">
                WAITING
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-[10px] text-slate-500">训练轮次 (Episode):</span>
            <span className="text-[10px] font-mono text-emerald-600">{stats.episode}</span>
            <span className="text-[10px] text-slate-500">当前奖励 (Reward):</span>
            <span className="text-[10px] font-mono text-emerald-600">+{stats.reward}</span>
            <span className="text-[10px] text-slate-500">探索率 (Epsilon):</span>
            <span className="text-[10px] font-mono text-amber-600">{stats.epsilon}</span>
            <span className="text-[10px] text-slate-500">当前步数 (Steps):</span>
            <span className="text-[10px] font-mono text-slate-600">{stats.steps}</span>
          </div>
        </div>

        {!isLive && (
          <div className="mt-4 p-4 bg-white/90 border border-emerald-500/20 rounded-xl max-w-[260px] backdrop-blur-md pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-emerald-600">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <Terminal className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold tracking-tight">智能接入强化学习</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
              未检测到活跃的强化学习任务。只需导入助手库即可自动捕获智能体状态并开启实时训练可视化。
            </p>
            <div className="space-y-2">
              <div className="bg-slate-50 p-2.5 rounded-lg text-[9px] font-mono text-emerald-700/80 border border-emerald-500/10 whitespace-pre-wrap leading-tight">
                {`import deepinsight\ndeepinsight.log_rl(reward=r, episode=e)`}
              </div>
              <button 
                onClick={() => setShowCommand(!showCommand)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg transition-all"
              >
                {showCommand ? '隐藏测试指令' : '运行演示脚本 (Run Demo)'}
              </button>
            </div>

            {showCommand && (
              <div className="mt-3 p-2 bg-slate-800 rounded-lg border border-emerald-500/30 text-[9px] font-mono text-emerald-400 break-all select-all cursor-copy animate-in fade-in slide-in-from-top-2">
                uv run python scripts/comprehensive_test.py
              </div>
            )}
          </div>
        )}
      </div>

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[8, 8, 8]} />
        <color attach="background" args={['#f1f5f9']} />
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
        <Environment />
        <Agent position={agentPos} />
        <OrbitControls makeDefault />
      </Canvas>

      <div className="absolute bottom-4 left-4 right-4 z-10 flex gap-2 overflow-x-auto no-scrollbar">
        {links.map(link => (
          <button 
            key={link.label} 
            onClick={() => editorOpenFile({ path: link.path, lineNumber: link.line })}
            className="px-3 py-1 bg-white/80 backdrop-blur border border-slate-200 rounded-full text-[10px] text-slate-600 whitespace-nowrap hover:bg-white hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center gap-1"
          >
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            {link.label}
          </button>
        ))}
      </div>
    </div>
  );
};
