from __future__ import annotations

import shutil
import subprocess
import time
import psutil
import platform
import socket
import os
import sys
import re
import json
from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class GpuSnapshot:
    index: int
    name: str
    utilization_gpu: int
    memory_used_mb: int
    memory_total_mb: int
    temperature_c: int


@dataclass(frozen=True)
class CpuSnapshot:
    utilization: float
    temp_c: float | None = None


# 预热 psutil.cpu_percent
psutil.cpu_percent(interval=None)


def _get_lan_ip():
    """获取局域网 IP"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # 并不需要真的连接成功
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        try:
            return socket.gethostbyname(socket.gethostname())
        except:
            return "127.0.0.1"


def _get_pro_cpu_name():
    """模仿专业工具从注册表获取 CPU 完整型号"""
    if platform.system() != "Windows":
        return platform.processor()
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
        name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
        winreg.CloseKey(key)
        return name.strip()
    except:
        try:
            # 备份方案：wmic
            out = subprocess.check_output(["wmic", "cpu", "get", "name"], text=True).splitlines()
            if len(out) >= 2 and out[1].strip():
                return out[1].strip()
        except:
            return platform.processor()


def get_system_info():
    """获取详细的硬件和系统信息"""
    
    # 1. 获取 CPU 真实型号 (Pro 模式)
    cpu_brand = _get_pro_cpu_name()
    
    # 2. 获取主板信息
    board_info = {
        "manufacturer": "Unknown",
        "product": "Unknown",
        "version": "Unknown",
        "serial": "Unknown"
    }
    if platform.system() == "Windows":
        # 优先尝试注册表 (BIOS 信息通常最准)
        try:
            import winreg
            bios_key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\BIOS")
            board_info["manufacturer"] = winreg.QueryValueEx(bios_key, "BaseBoardManufacturer")[0].strip()
            board_info["product"] = winreg.QueryValueEx(bios_key, "BaseBoardProduct")[0].strip()
            board_info["version"] = winreg.QueryValueEx(bios_key, "BaseBoardVersion")[0].strip()
            winreg.CloseKey(bios_key)
        except:
            pass

        # 如果注册表没拿到，或者拿到的是 Unknown，尝试 PowerShell
        if board_info["manufacturer"] in ["Unknown", "Default string", "To be filled by O.E.M."]:
            try:
                ps_cmd = "Get-CimInstance Win32_BaseBoard | Select-Object Manufacturer, Product, Version, SerialNumber | ConvertTo-Json"
                out = subprocess.check_output(["powershell", "-Command", ps_cmd], text=True, timeout=3)
                if out.strip():
                    data = json.loads(out)
                    if isinstance(data, list): data = data[0]
                    board_info["manufacturer"] = data.get("Manufacturer", board_info["manufacturer"]) or "Unknown"
                    board_info["product"] = data.get("Product", board_info["product"]) or "Unknown"
                    board_info["version"] = data.get("Version", board_info["version"]) or "Unknown"
                    board_info["serial"] = data.get("SerialNumber", board_info["serial"]) or "Unknown"
            except:
                pass

    # 3. 获取内存详细信息 (插槽、频率、类型)
    memory_summary = {
        "total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
        "slots": []
    }
    if platform.system() == "Windows":
        try:
            # 优先使用 PowerShell Get-CimInstance，比 wmic 更现代且格式更稳
            # 增加 SMBIOSMemoryType 识别，这是识别 DDR5 的关键
            ps_mem_cmd = "Get-CimInstance Win32_PhysicalMemory | Select-Object Capacity, Speed, Manufacturer, PartNumber, DeviceLocator, MemoryType, SMBIOSMemoryType, ConfiguredClockSpeed | ConvertTo-Json"
            out = subprocess.check_output(["powershell", "-Command", ps_mem_cmd], text=True, timeout=5)
            if out.strip():
                data = json.loads(out)
                items = data if isinstance(data, list) else [data]
                # 完善内存类型映射 (SMBIOS 规范)
                mt_map = {
                    "0": "Unknown", "20": "DDR", "21": "DDR2", "22": "DDR2 FB-DIMM", 
                    "24": "DDR3", "26": "DDR4", "30": "LPDDR3", "31": "LPDDR4", 
                    "34": "DDR5", "35": "LPDDR5"
                }
                for item in items:
                    # 优先取 SMBIOSMemoryType，因为它更符合现代硬件 (DDR4=26, DDR5=34)
                    m_type_code = str(item.get("SMBIOSMemoryType") or item.get("MemoryType") or "0")
                    memory_summary["slots"].append({
                        "capacity_gb": int(item.get("Capacity", 0)) // (1024**3),
                        "speed": str(item.get("ConfiguredClockSpeed") or item.get("Speed", "Unknown")),
                        "manufacturer": item.get("Manufacturer", "Unknown").strip(),
                        "part_number": item.get("PartNumber", "Unknown").strip(),
                        "slot": item.get("DeviceLocator", "Unknown").strip(),
                        "type": mt_map.get(m_type_code, f"Type {m_type_code}")
                    })
        except:
            # 最后的 wmic 兜底 (保留原有逻辑)
            try:
                out = subprocess.check_output(["wmic", "memorychip", "get", "capacity,speed,manufacturer,partnumber,devicelocator,memorytype,configuredclockspeed", "/format:list"], text=True).splitlines()
                current_mem = {}
                for line in out:
                    line = line.strip()
                    if not line:
                        if current_mem:
                            memory_summary["slots"].append(current_mem)
                            current_mem = {}
                        continue
                    if "=" in line:
                        key, val = line.split("=", 1)
                        key = key.strip().lower()
                        val = val.strip()
                        if key == "capacity": current_mem["capacity_gb"] = int(val) // (1024**3) if val.isdigit() else 0
                        elif key == "speed" or key == "configuredclockspeed": current_mem["speed"] = val
                        elif key == "manufacturer": current_mem["manufacturer"] = val
                        elif key == "partnumber": current_mem["part_number"] = val
                        elif key == "devicelocator": current_mem["slot"] = val
                        elif key == "memorytype":
                            mt_map = {"20": "DDR", "21": "DDR2", "24": "DDR3", "26": "DDR4", "34": "DDR5"}
                            current_mem["type"] = mt_map.get(val, f"Type {val}")
                if current_mem:
                    memory_summary["slots"].append(current_mem)
            except:
                pass

    # 4. 网络接口信息
    net_info = {
        "ip": _get_lan_ip(),
        "interfaces": []
    }
    try:
        addrs = psutil.net_if_addrs()
        stats = psutil.net_if_stats()
        for name, info_list in addrs.items():
            if name == "lo" or "loopback" in name.lower(): continue
            ipv4 = "Unknown"
            mac = "Unknown"
            for addr in info_list:
                if addr.family == socket.AF_INET: ipv4 = addr.address
                elif addr.family == psutil.AF_LINK: mac = addr.address
            
            s = stats.get(name)
            net_info["interfaces"].append({
                "name": name,
                "ip": ipv4,
                "mac": mac,
                "speed": s.speed if s else 0,
                "is_up": s.isup if s else False
            })
    except:
        pass

    info = {
        "os": {
            "platform": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "architecture": platform.machine(),
            "hostname": socket.gethostname(),
            "board": board_info
        },
        "cpu": {
            "brand": cpu_brand,
            "cores_physical": psutil.cpu_count(logical=False) or 0,
            "cores_logical": psutil.cpu_count(logical=True) or 0,
            "freq_mhz": (psutil.cpu_freq().max if psutil.cpu_freq() else 0) or (psutil.cpu_freq().current if psutil.cpu_freq() else 0),
        },
        "memory": memory_summary,
        "network": net_info,
        "gpus": [],
        "python_envs": discover_python_envs()
    }

    # GPU 信息
    gpus, _ = _run_all_gpu_smi()
    info["gpus"] = [asdict(g) for g in gpus]

    return info


def discover_python_envs():
    """自动发现系统中的 Python 环境 (Conda, venv, uv)"""
    envs = []

    # 1. 发现 Conda 环境
    conda_exe = shutil.which("conda")
    if conda_exe:
        try:
            out = subprocess.check_output([conda_exe, "env", "list", "--json"], text=True, timeout=5)
            data = json.loads(out)
            for env_path in data.get("envs", []):
                envs.append({
                    "type": "conda",
                    "path": os.path.join(env_path, "python.exe" if platform.system() == "Windows" else "bin/python"),
                    "name": os.path.basename(env_path)
                })
        except Exception:
            pass

    # 2. 发现 uv 环境
    uv_exe = shutil.which("uv")
    if uv_exe:
        # uv 通常在当前目录或全局缓存中
        envs.append({
            "type": "uv",
            "path": "uv run python",
            "name": "uv (Auto)"
        })

    # 3. 发现当前系统 Python
    envs.append({
        "type": "system",
        "path": sys.executable,
        "name": f"System Python ({platform.python_version()})"
    })

    # 4. 扫描常见位置 (例如当前目录下的 .venv)
    # 这部分逻辑可以根据需要在 executor.py 中动态执行，这里只列出全局已知的

    return envs


def _run_all_gpu_smi() -> tuple[list[GpuSnapshot], str | None]:
    """尝试获取所有类型的 GPU 信息"""
    all_gpus = []
    errors = []

    # 1. NVIDIA
    nv_gpus, nv_err = _run_nvidia_smi()
    if nv_gpus:
        all_gpus.extend(nv_gpus)
    elif nv_err:
        errors.append(nv_err)

    # 2. AMD (ROCm-SMI or AMD-SMI)
    amd_gpus, amd_err = _run_amd_smi()
    if amd_gpus:
        all_gpus.extend(amd_gpus)
    elif amd_err:
        errors.append(amd_err)

    # 3. 如果没找到任何 SMI，使用系统通用方法 (WMIC/Powershell) 获取基本信息
    if not all_gpus:
        generic_gpus, gen_err = _run_generic_gpu_info()
        if generic_gpus:
            all_gpus.extend(generic_gpus)
        elif gen_err:
            errors.append(gen_err)

    return all_gpus, "; ".join(errors) if errors else None


def _run_nvidia_smi() -> tuple[list[GpuSnapshot], str | None]:
    exe = shutil.which("nvidia-smi")
    if not exe:
        return ([], "nvidia-smi not found")

    query = [
        "index",
        "name",
        "utilization.gpu",
        "memory.used",
        "memory.total",
        "temperature.gpu",
    ]
    cmd = [
        exe,
        f"--query-gpu={','.join(query)}",
        "--format=csv,noheader,nounits",
    ]
    try:
        out = subprocess.check_output(cmd, stderr=subprocess.STDOUT, text=True, timeout=1.5)
    except subprocess.TimeoutExpired:
        return ([], "nvidia-smi timeout")
    except Exception as e:
        return ([], f"nvidia-smi error: {type(e).__name__}")

    gpus: list[GpuSnapshot] = []
    for line in out.splitlines():
        raw = line.strip()
        if not raw:
            continue
        parts = [p.strip() for p in raw.split(",")]
        if len(parts) != 6:
            continue
        try:
            idx = int(parts[0])
            name = parts[1]
            util = int(float(parts[2]))
            mem_used = int(float(parts[3]))
            mem_total = int(float(parts[4]))
            temp = int(float(parts[5]))
        except Exception:
            continue
        gpus.append(
            GpuSnapshot(
                index=idx,
                name=name,
                utilization_gpu=util,
                memory_used_mb=mem_used,
                memory_total_mb=mem_total,
                temperature_c=temp,
            )
        )
    return (gpus, None)


def _run_amd_smi() -> tuple[list[GpuSnapshot], str | None]:
    """尝试获取 AMD GPU 信息 (通过 rocm-smi 或 amd-smi)"""
    # Windows 上 AMD 常用的是 amd-smi (如果安装了驱动)
    exe = shutil.which("amd-smi") or shutil.which("rocm-smi")
    if not exe:
        return ([], "amd-smi not found")

    try:
        # amd-smi static --json 通常返回静态信息，而 amd-smi monitor --json 返回动态信息
        # 这里尝试获取负载信息
        cmd = [exe, "monitor", "--json", "--iterations", "1"]
        out = subprocess.check_output(cmd, text=True, timeout=2)
        data = json.loads(out)
        
        gpus = []
        # amd-smi 的 JSON 结构通常是 list[dict]
        if isinstance(data, list):
            for i, dev in enumerate(data):
                gpus.append(GpuSnapshot(
                    index=i,
                    name=dev.get("name", f"AMD GPU {i}"),
                    utilization_gpu=int(dev.get("gpu_utilization", 0)),
                    memory_used_mb=int(dev.get("vram_used", 0)),
                    memory_total_mb=int(dev.get("vram_total", 0)),
                    temperature_c=int(dev.get("temperature", 0))
                ))
        return (gpus, None)
    except Exception as e:
        # 如果 monitor 失败，尝试简单列表
        try:
            out = subprocess.check_output([exe, "static", "--json"], text=True, timeout=2)
            data = json.loads(out)
            gpus = []
            if isinstance(data, list):
                for i, dev in enumerate(data):
                    gpus.append(GpuSnapshot(
                        index=i,
                        name=dev.get("name", f"AMD GPU {i}"),
                        utilization_gpu=0,
                        memory_used_mb=0,
                        memory_total_mb=int(dev.get("vram_total", 0)),
                        temperature_c=0
                    ))
            return (gpus, None)
        except:
            return ([], f"amd-smi error: {type(e).__name__}")


def _run_generic_gpu_info() -> tuple[list[GpuSnapshot], str | None]:
    """使用 Windows PowerShell 获取基本显卡信息 (比 WMIC 更可靠)"""
    if platform.system() != "Windows":
        return ([], "Not Windows")

    errors = []
    gpus: list[GpuSnapshot] = []

    # 1. 尝试从注册表获取显卡列表 (鲁大师等工具常用)
    # HKEY_LOCAL_MACHINE\SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}
    try:
        import winreg
        path = r"SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}"
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, path)
        for i in range(winreg.QueryInfoKey(key)[0]):
            sub_key_name = winreg.EnumKey(key, i)
            if not sub_key_name.isdigit(): continue
            sub_key = winreg.OpenKey(key, sub_key_name)
            try:
                # 排除 Microsoft Basic Display Adapter (通常意味着没驱动)
                provider, _ = winreg.QueryValueEx(sub_key, "ProviderName")
                if provider == "Microsoft":
                    # 虽然是微软驱动，但如果没别的卡，也记录下来，但在名字里标明
                    pass
                
                name, _ = winreg.QueryValueEx(sub_key, "DriverDesc")
                
                # 检查显存 (更精准的 64位 显存读取)
                mem_mb = 0
                # 优先级: qwMemorySize (64位) > MemorySize (32位)
                for mem_val_name in ["HardwareInformation.qwMemorySize", "HardwareInformation.MemorySize"]:
                    try:
                        mem_raw, _ = winreg.QueryValueEx(sub_key, mem_val_name)
                        if isinstance(mem_raw, bytes):
                            import struct
                            # 如果是 8 字节，按 64 位无符号长整型解析
                            if len(mem_raw) >= 8:
                                mem_mb = struct.unpack("<Q", mem_raw[:8])[0] // (1024*1024)
                            else:
                                mem_mb = struct.unpack("<I", mem_raw[:4])[0] // (1024*1024)
                        else:
                            # 鲁大师等工具发现有些驱动直接存的是 int，且可能是负数（溢出），需要转为无符号
                            val = int(mem_raw)
                            if val < 0: val += 0x100000000 # 补码转无符号 32位
                            mem_mb = val // (1024*1024)
                        
                        # 特殊修正：驱动可能报告 0xFFFFFFFF 表示未知，或者 0
                        if mem_mb == 0 or mem_mb >= 0xFFFFFF: 
                            mem_mb = 0
                            continue
                            
                        # 智能进位修正：RX 580 等显卡驱动常报 4095
                        if (mem_mb + 1) % 128 == 0: mem_mb += 1
                        elif (mem_mb + 2) % 128 == 0: mem_mb += 2
                        
                        if mem_mb > 0: break
                    except:
                        continue
                
                # 如果注册表没拿到显存，尝试通过 dxdiag 导出的数据或 PowerShell 再次确认
                if mem_mb == 0:
                    try:
                        # 这是一个比较重的操作，但作为最后的兜底
                        ps_vram = f"Get-CimInstance Win32_VideoController | Where-Object {{ $_.Name -eq '{name}' }} | Select-Object AdapterRAM | ConvertTo-Json"
                        vram_out = subprocess.check_output(["powershell", "-Command", ps_vram], text=True, timeout=2)
                        if vram_out.strip():
                            vram_data = json.loads(vram_out)
                            raw_ram = abs(int(vram_data.get("AdapterRAM", 0)))
                            if raw_ram > 0:
                                mem_mb = raw_ram // (1024 * 1024)
                    except:
                        pass

                # 避免重复和虚假条目 (通过检查是否有匹配的 DeviceID)
                try:
                    winreg.QueryValueEx(sub_key, "MatchingDeviceId")
                    is_real = True
                except:
                    is_real = False

                if is_real and not any(g.name == name for g in gpus):
                    gpus.append(GpuSnapshot(
                        index=len(gpus),
                        name=name,
                        utilization_gpu=0,
                        memory_used_mb=0,
                        memory_total_mb=mem_mb,
                        temperature_c=0
                    ))
            except:
                pass
            winreg.CloseKey(sub_key)
        winreg.CloseKey(key)
    except Exception as e:
        errors.append(f"Registry GPU query failed: {e}")

    # 2. 尝试获取实时负载 (如果已经有 GPU 了)
    if gpus:
        try:
            # 改进：Win32_PerfFormattedData 可能不准，尝试更底层的性能计数器
            # 获取 3D 引擎和显存相关的性能计数器
            ps_util = (
                "$counters = Get-Counter '\\GPU Engine(*engtype_3D)\\Utilization Percentage', '\\GPU Process Memory(*)\\Local Usage' -ErrorAction SilentlyContinue; "
                "if ($counters) { "
                "  $counters.CounterSamples | Select-Object CookedValue, InstanceName, Path | ConvertTo-Json "
                "} else { '[]' }"
            )
            util_out = subprocess.check_output(["powershell", "-Command", ps_util], text=True, timeout=3)
            if util_out.strip() and util_out != "[]":
                util_data = json.loads(util_out)
                utils = util_data if isinstance(util_data, list) else [util_data]
                
                # 记录显存已使用 (Local Usage)
                mem_used_by_phys = {} # phys_idx -> total_used_bytes

                for u in utils:
                    val = u.get("CookedValue", 0)
                    inst = u.get("InstanceName", "")
                    path = u.get("Path", "").lower()
                    
                    # 匹配物理卡索引 phys_N
                    match = re.search(r"phys_(\d+)", inst)
                    phys_idx = int(match.group(1)) if match else 0
                    
                    if phys_idx < len(gpus):
                        if "gpu engine" in path:
                            # 3D 负载
                            if val > gpus[phys_idx].utilization_gpu:
                                g = gpus[phys_idx]
                                gpus[phys_idx] = GpuSnapshot(
                                    index=g.index, name=g.name, utilization_gpu=int(val),
                                    memory_used_mb=g.memory_used_mb, memory_total_mb=g.memory_total_mb,
                                    temperature_c=g.temperature_c
                                )
                        elif "gpu process memory" in path:
                            # 显存占用 (字节转 MB)
                            mem_used_by_phys[phys_idx] = mem_used_by_phys.get(phys_idx, 0) + val

                # 更新显存占用
                for p_idx, used_bytes in mem_used_by_phys.items():
                    if p_idx < len(gpus):
                        g = gpus[p_idx]
                        used_mb = int(used_bytes // (1024 * 1024))
                        gpus[p_idx] = GpuSnapshot(
                            index=g.index, name=g.name, utilization_gpu=g.utilization_gpu,
                            memory_used_mb=used_mb, memory_total_mb=g.memory_total_mb,
                            temperature_c=g.temperature_c
                        )
            
            # 尝试获取温度 (仅限部分驱动支持，且需要管理员权限或特定 WMI 类)
            try:
                # 尝试通过 ThermalZone 或特定供应商的 WMI (如 MSI/Asus)
                # 这是一个通用的 ThermalZone 尝试，不一定能拿到 GPU 温度
                ps_temp = "Get-CimInstance -Namespace root/wmi -ClassName MsAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | Select-Object CurrentTemperature"
                temp_out = subprocess.check_output(["powershell", "-Command", ps_temp], text=True, timeout=1)
                if temp_out.strip():
                    temp_data = json.loads(temp_out)
                    temp_items = temp_data if isinstance(data, list) else [temp_data]
                    if temp_items:
                        # 0.1K 转摄氏度
                        temp_c = (int(temp_items[0].get("CurrentTemperature", 0)) / 10.0) - 273.15
                        if 0 < temp_c < 120:
                            # 暂时只应用给第一个显卡，因为 ThermalZone 很难区分是哪个
                            g = gpus[0]
                            gpus[0] = GpuSnapshot(
                                index=g.index, name=g.name, utilization_gpu=g.utilization_gpu,
                                memory_used_mb=g.memory_used_mb, memory_total_mb=g.memory_total_mb,
                                temperature_c=int(temp_c)
                            )
            except:
                pass

        except:
            pass
        return (gpus, None if not errors else "; ".join(errors))

    # 3. 如果注册表没拿到，回退到之前的 PowerShell CIM 方法
    try:
        # ... (保留原有的 PowerShell 逻辑作为兜底)
        ps_cmd = (
            "Get-CimInstance Win32_VideoController | "
            "Select-Object Name, VideoProcessor, AdapterRAM | ConvertTo-Json"
        )
        out = subprocess.check_output(["powershell", "-Command", ps_cmd], text=True, timeout=3)
        if out.strip():
            data = json.loads(out)
            items = data if isinstance(data, list) else [data]
            for i, item in enumerate(items):
                name = item.get("Name") or item.get("VideoProcessor") or "Unknown GPU"
                raw_ram = item.get("AdapterRAM", 0)
                ram_mb = abs(int(raw_ram)) // (1024 * 1024) if str(raw_ram).replace('-','').isdigit() else 0
                gpus.append(GpuSnapshot(index=i, name=name, utilization_gpu=0, memory_used_mb=0, memory_total_mb=ram_mb, temperature_c=0))
            return (gpus, None)
    except Exception as e:
        errors.append(f"CIM fallback failed: {e}")

    return (gpus, "; ".join(errors) if errors else "No GPUs found")


def read_hw_snapshot() -> tuple[int, list[GpuSnapshot], CpuSnapshot, str | None]:
    ts_ms = int(time.time() * 1000)
    gpus, err = _run_all_gpu_smi()
    
    # 获取 CPU 使用率 (1秒内的平均值会阻塞，这里取立即值)
    # 在异步循环中，我们通常使用 interval=None 配合之前的调用
    cpu_util = psutil.cpu_percent(interval=None)
    cpu = CpuSnapshot(utilization=cpu_util)
    
    return (ts_ms, gpus, cpu, err)

