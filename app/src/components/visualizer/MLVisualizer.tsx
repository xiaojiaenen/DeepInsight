import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { editorOpenFile } from '../../lib/editorBus';
import { subscribeRuns } from '../../features/runs/runsStore';
import { Terminal } from 'lucide-react';

const PointCloud = ({ data }: { data: any[] }) => {
  const points = useMemo(() => {
    if (data && data.length > 0) {
      return data.map(p => ({
        pos: p.pos,
        color: new THREE.Color(p.color || '#10b981')
      }));
    }
    
    return [];
  }, [data]);

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
  const [realData, setRealData] = useState<any[]>([]);
  const [showCommand, setShowCommand] = useState(false);

  // 监听真实运行指标
  useEffect(() => {
    return subscribeRuns((allRuns) => {
      const activeRun = allRuns.find(r => !r.finishedAt);
      if (!activeRun) {
        setRealData([]);
        return;
      }

      const mlMetric = activeRun.metrics.findLast(m => m.name === 'ml_points');
      if (mlMetric) {
        if (typeof mlMetric.value === 'string') {
          try {
            const points = JSON.parse(mlMetric.value);
            if (Array.isArray(points)) {
              setRealData(points);
            }
          } catch (e) {
            console.error('Failed to parse ml_points:', e);
          }
        } else if (Array.isArray(mlMetric.value)) {
          setRealData(mlMetric.value);
        }
      }
    });
  }, []);

  return (
    <div className="w-full h-full bg-slate-900 relative">
      <div className="absolute top-4 left-4 z-10 text-white flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold uppercase tracking-widest opacity-50 text-slate-400">特征空间 (Feature Space)</h4>
          {realData.length > 0 ? (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold border border-emerald-500/30 animate-pulse">
              LIVE
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 text-[9px] font-bold border border-slate-700">
              WAITING
            </span>
          )}
        </div>
        <p className="text-[10px] opacity-70 text-slate-300">
          {realData.length > 0 ? '实时模型数据投影' : '等待接入实时特征空间数据...'}
        </p>
        
        {realData.length === 0 && (
          <div className="mt-4 p-4 bg-slate-900/90 border border-emerald-500/20 rounded-xl max-w-[260px] backdrop-blur-md pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-emerald-400">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <Terminal className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold tracking-tight">智能接入数据投影</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
              当前无实时数据。导入助手库即可自动提取特征空间并开启 3D 点云可视化。
            </p>
            <div className="space-y-2">
              <div className="bg-black/40 p-2.5 rounded-lg text-[9px] font-mono text-emerald-300/80 border border-emerald-500/10 whitespace-pre-wrap leading-tight">
                {`import deepinsight\ndeepinsight.watch(X_train)`}
              </div>
              <button 
                onClick={() => editorOpenFile({ path: 'main.py', lineNumber: 1 })}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg transition-all"
              >
                打开主程序开始集成
              </button>
              <button 
                onClick={() => setShowCommand(!showCommand)}
                className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20 transition-all"
              >
                {showCommand ? '隐藏测试指令' : '运行演示脚本 (Run Demo)'}
              </button>
            </div>

            {showCommand && (
              <div className="mt-3 p-2 bg-black/60 rounded-lg border border-emerald-500/30 text-[9px] font-mono text-emerald-500/90 break-all select-all cursor-copy animate-in fade-in slide-in-from-top-2">
                uv run python scripts/comprehensive_test.py
              </div>
            )}
          </div>
        )}

        <button 
          onClick={() => editorOpenFile({ path: 'preprocessing.py', lineNumber: 1 })}
          className="mt-2 text-[9px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 pointer-events-auto"
        >
          <span className="w-1 h-1 bg-emerald-400 rounded-full" />
          查看预处理逻辑 (VIEW PREPROCESSING)
        </button>
      </div>
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <PointCloud data={realData} />
        <OrbitControls autoRotate autoRotateSpeed={0.5} enablePan={false} />
      </Canvas>
      <div className="absolute bottom-4 right-4 z-10 flex gap-4 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-500" />
          <span className="text-[10px] text-white opacity-60">分类 A (Cluster A)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-500" />
          <span className="text-[10px] text-white opacity-60">分类 B (Cluster B)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-white opacity-60">分类 C (Cluster C)</span>
        </div>
      </div>
    </div>
  );
};
