import React, { useEffect, useState } from 'react'
import { 
  Cpu, 
  HardDrive, 
  Monitor, 
  Network, 
  Info, 
  RefreshCw, 
  Terminal, 
  Package, 
  ChevronDown, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Box,
  Activity,
  Thermometer
} from 'lucide-react'
import { motion } from 'framer-motion'
import { subscribeSystemInfo, type SystemInfo } from '../../features/system/systemStore'
import { subscribeHwHistory, type HwSnapshot } from '../../features/hw/hwStore'
import { installPythonDeps, getWorkspaceState } from '../../features/workspace/workspaceStore'
import { useKernel } from '../../features/kernel/useKernel'
import { cn } from '../layout/cn'

export const SystemInfoPanel: React.FC = () => {
  const [info, setInfo] = useState<SystemInfo | null>(null)
  const [history, setHistory] = useState<HwSnapshot[]>([])
  const [activeSection, setActiveSection] = useState<string>('all')
  const [installing, setInstalling] = useState(false)
  const { requestSystemInfo } = useKernel()
  const ws = getWorkspaceState()

  useEffect(() => {
    // 挂载时立即刷新
    requestSystemInfo()
    
    // 设置定时器，每 2 秒自动请求一次最新数据 (实现实时性)
    const timer = setInterval(() => {
      requestSystemInfo()
    }, 2000)

    const unsubInfo = subscribeSystemInfo((data) => setInfo(data))
    const unsubHw = subscribeHwHistory((data) => setHistory(data))
    
    return () => {
      clearInterval(timer)
      unsubInfo()
      unsubHw()
    }
  }, [])

  const handleRefresh = () => {
    requestSystemInfo()
  }

  const handleInstall = async () => {
    if (!ws.root) return
    setInstalling(true)
    try {
      await installPythonDeps()
    } finally {
      setInstalling(false)
    }
  }

  if (!info) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
        <RefreshCw className="w-8 h-8 mb-4 animate-spin opacity-20" />
        <p className="text-sm">正在获取系统硬件信息...</p>
      </div>
    )
  }

  const sections = [
    { id: 'all', label: '概览', icon: Info },
    { id: 'perf', label: '性能', icon: Activity },
    { id: 'os', label: '系统', icon: Monitor },
    { id: 'cpu', label: '处理器', icon: Cpu },
    { id: 'gpu', label: '显卡', icon: Zap },
    { id: 'memory', label: '内存', icon: HardDrive },
    { id: 'network', label: '网络', icon: Network },
    { id: 'envs', label: 'Python 环境', icon: Box },
  ]

  const InfoRow: React.FC<{ label: string; value: string | number; icon?: any }> = ({ label, value, icon: Icon }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <span className="text-xs font-medium text-slate-700 tabular-nums">{value}</span>
    </div>
  )

  const MiniChart: React.FC<{ data: number[]; color: string; label: string }> = ({ data, color, label }) => (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-mono font-bold text-slate-700">{data.length > 0 ? data[data.length - 1].toFixed(1) : 0}%</span>
      </div>
      <div className="h-16 flex items-end gap-[1.5px] pt-2">
        {data.map((v, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(2, v)}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn("flex-1 rounded-t-[1.5px] transition-colors duration-500", color)}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden">
      {/* 头部 */}
      <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            硬件与系统信息
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            实时监控中 · {info.os.hostname} ({info.network.ip})
          </p>
        </div>
      </div>

      {/* 快捷导航 */}
      <div className="flex p-1 gap-1 overflow-x-auto bg-white border-b border-slate-200 scrollbar-none">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] whitespace-nowrap transition-all",
              activeSection === s.id 
                ? "bg-slate-100 text-slate-900 font-medium shadow-sm" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            )}
          >
            <s.icon className={cn("w-3.5 h-3.5", activeSection === s.id ? "text-blue-500" : "text-slate-400")} />
            {s.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeSection === 'perf' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <MiniChart 
                label="CPU 负载" 
                data={history.map(h => h.cpu?.utilization ?? 0)} 
                color="bg-orange-400" 
              />
              <MiniChart 
                label="GPU 负载" 
                data={history.map(h => h.gpus?.[0]?.utilization_gpu ?? 0)} 
                color="bg-blue-400" 
              />
            </div>
            
            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-800">实时监控数据</span>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <InfoRow 
                  label="CPU 使用率" 
                  value={`${history.length > 0 ? history[history.length - 1].cpu?.utilization.toFixed(1) : 0}%`} 
                />
                <InfoRow 
                  label="GPU 使用率" 
                  value={`${history.length > 0 ? (history[history.length - 1].gpus?.[0]?.utilization_gpu ?? 0).toFixed(1) : 0}%`} 
                />
                <InfoRow 
                  label="显存占用" 
                  value={`${history.length > 0 ? (history[history.length - 1].gpus?.[0]?.memory_used_mb ?? 0) : 0} MB`} 
                />
                <InfoRow 
                  label="GPU 温度" 
                  value={`${history.length > 0 ? (history[history.length - 1].gpus?.[0]?.temperature_c ?? 0) : 0}°C`} 
                />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <Terminal className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800">活跃 Kernel 进程</span>
              </div>
              <div className="text-[11px] text-slate-500 italic py-2 text-center">
                暂无正在运行的本地训练任务
              </div>
            </div>
          </div>
        )}

        {(activeSection === 'all' || activeSection === 'os') && (
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
              <Monitor className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-slate-800">操作系统</span>
            </div>
            <InfoRow label="系统名称" value={info.os.platform} />
            <InfoRow label="发行版本" value={info.os.release} />
            <InfoRow label="系统架构" value={info.os.architecture} />
            <InfoRow label="内核版本" value={info.os.version.split(' ')[0]} />
            <div className="mt-3 pt-2 border-t border-slate-50">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">主板信息</div>
              <InfoRow label="制造商" value={info.os.board?.manufacturer || 'Unknown'} />
              <InfoRow label="产品型号" value={info.os.board?.product || 'Unknown'} />
              <InfoRow label="版本/序列号" value={`${info.os.board?.version || 'Unknown'} / ${info.os.board?.serial || 'Unknown'}`} />
            </div>
          </div>
        )}

        {(activeSection === 'all' || activeSection === 'cpu') && (
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
              <Cpu className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-slate-800">中央处理器 (CPU)</span>
            </div>
            <div className="mb-2 p-2 bg-slate-50 rounded text-[11px] text-slate-600 font-medium leading-relaxed">
              {info.cpu.brand}
            </div>
            <InfoRow label="物理核心" value={info.cpu.cores_physical} />
            <InfoRow label="逻辑核心" value={info.cpu.cores_logical} />
            <InfoRow label="最大频率" value={`${info.cpu.freq_mhz} MHz`} />
          </div>
        )}

        {(activeSection === 'all' || activeSection === 'gpu') && (
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-bold text-slate-800">图形处理器 (GPU)</span>
            </div>
            {info.gpus.length === 0 ? (
              <div className="text-[11px] text-slate-400 italic py-2">未检测到显卡 (NVIDIA/AMD)</div>
            ) : (
              info.gpus.map((g, i) => (
                <div key={i} className="space-y-1 mb-3 last:mb-0 border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                  <div className="p-2 bg-slate-50 rounded text-[11px] text-slate-600 font-medium mb-1 flex justify-between">
                    <span>#{g.index} {g.name}</span>
                    {g.temperature_c > 0 && <span className="text-orange-500">{g.temperature_c}°C</span>}
                  </div>
                  <InfoRow label="总显存" value={`${g.memory_total_mb} MB`} />
                  <InfoRow label="当前负载" value={`${g.utilization_gpu}%`} />
                  <div className="mt-1 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400" 
                      style={{ width: `${g.utilization_gpu}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {(activeSection === 'all' || activeSection === 'memory') && (
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
              <HardDrive className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-800">内存 (RAM)</span>
            </div>
            <InfoRow label="总容量" value={`${info.memory.total_gb} GB`} />
            
            <div className="mt-3 space-y-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">插槽详情</div>
              {!info.memory.slots || info.memory.slots.length === 0 ? (
                <div className="text-[10px] text-slate-400 italic">无法获取详细插槽信息</div>
              ) : (
                info.memory.slots.map((s, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-800 leading-tight truncate max-w-[140px]">{s.slot || `Slot ${i}`}</span>
                        <span className="text-[9px] text-slate-400 font-mono uppercase tracking-tighter">BANK {i}</span>
                      </div>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm",
                        s.type.includes('DDR5') ? "bg-blue-500 text-white" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {s.type}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1 text-[10px]">
                      <div className="flex items-center gap-1">
                        <Box className="w-2.5 h-2.5 text-slate-300" />
                        <span className="text-slate-500">容量:</span>
                        <span className="text-slate-700 font-semibold">{s.capacity_gb} GB</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-slate-300" />
                        <span className="text-slate-500">频率:</span>
                        <span className="text-slate-700 font-semibold">{s.speed} MHz</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1 mt-0.5 pt-1 border-t border-slate-100">
                        <Package className="w-2.5 h-2.5 text-slate-300" />
                        <span className="text-slate-500">品牌:</span>
                        <span className="text-slate-700 font-medium truncate">{s.manufacturer}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {(activeSection === 'all' || activeSection === 'envs') && (
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
              <Box className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-slate-800">Python 环境</span>
            </div>
            <div className="space-y-2">
              {info.python_envs.map((env, i) => (
                <div key={i} className="p-2 border border-slate-100 rounded-md hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-700">{env.name}</span>
                    <span className={cn(
                      "text-[9px] px-1 py-0.5 rounded uppercase font-medium",
                      env.type === 'conda' ? "bg-emerald-100 text-emerald-700" :
                      env.type === 'uv' ? "bg-purple-100 text-purple-700" :
                      "bg-slate-100 text-slate-700"
                    )}>
                      {env.type}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate font-mono">{env.path}</div>
                </div>
              ))}
            </div>
            <button 
              onClick={handleInstall}
              disabled={installing || !ws.root}
              className={cn(
                "w-full mt-3 py-2 bg-slate-900 text-white rounded text-[11px] font-medium flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors",
                (installing || !ws.root) && "opacity-50 cursor-not-allowed"
              )}
            >
              {installing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Package className="w-3 h-3" />}
              {installing ? "正在安装依赖..." : "一键安装适配依赖"}
            </button>
            {!ws.root && (
              <p className="text-[10px] text-slate-400 mt-2 text-center">请先打开项目文件夹以安装依赖</p>
            )}
          </div>
        )}

        {(activeSection === 'all' || activeSection === 'network') && (
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
              <Network className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-800">网络接口</span>
            </div>
            <div className="space-y-3">
              <InfoRow label="局域网 IP" value={info.network.ip} />
              <div className="mt-3 space-y-2">
                {info.network.interfaces && info.network.interfaces.length > 0 ? (
                  info.network.interfaces.map((iface, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-700 truncate max-w-[150px]">{iface.name}</span>
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                          iface.is_up ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                        )}>
                          {iface.is_up ? '在线' : '离线'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1 text-[10px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <span className="opacity-70">IP:</span>
                          <span className="text-slate-700 font-mono">{iface.ip}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="opacity-70">速度:</span>
                          <span className="text-slate-700">{iface.speed > 0 ? `${iface.speed} Mbps` : '未知'}</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1">
                          <span className="opacity-70">MAC:</span>
                          <span className="text-slate-700 font-mono">{iface.mac}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-400 italic py-2 text-center">暂无活跃网络接口信息</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 环境隔离提示区 */}
      <div className="p-3 bg-white border-t border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-bold text-slate-700">环境隔离提示</span>
        </div>
        <div className="p-2.5 bg-blue-50 border border-blue-100 rounded text-[10px] text-blue-700 leading-relaxed shadow-sm">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-500" />
            <div>
              <strong>当前处于“安全隔离”模式：</strong>
              <p className="mt-1 opacity-80">软件会自动在项目根目录查找 <code>.venv</code> 环境。通过“一键安装”，我们将为您在项目内部创建一个干净的虚拟环境，确保您的全局 Python 环境不受污染。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
