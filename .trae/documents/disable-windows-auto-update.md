# 计划：关闭 Windows 系统自动更新（全自动）

## 概要

在 Windows 10 Education 24H2 (Build 26100) 上，通过**注册表策略 + 服务禁用 + 计划任务禁用**三层手段，彻底关闭系统后台自动更新推送。生成两个脚本（关闭/恢复），用 UAC 弹窗提权执行一次（用户只需点一次"是"），随后自动验证并汇报结果。

## 当前状态分析（已探明）

| 项目 | 现状 |
|---|---|
| 系统 | Windows 10 Education 24H2, Build 26100 |
| 当前 Shell 权限 | **非管理员** → 必须走 UAC 提权 |
| wuauserv (Windows 更新) | Running, Start=3 (手动) |
| UsoSvc (更新 Orchestrator) | Running, Start=2 (自动) |
| DoSvc (传递优化) | Running, Start=2 (自动) |
| WaaSMedicSvc (更新医疗, 会偷偷恢复 wuauserv) | Stopped, Start=3 (手动) |
| BITS | Running, Auto — **计划保留**（Store/OneDrive 等依赖） |
| 组策略注册表键 (Policies\WindowsUpdate 等) | **全部未配置** → 干净状态，可完整回滚 |
| 计划任务 | `\Microsoft\Windows\WindowsUpdate\Scheduled Start` (Ready)；UpdateOrchestrator 路径枚举受限，执行时按枚举结果逐个禁用 |

## 方案设计

采用注册表法（家庭版/教育版通用，不依赖 gpedit.msc）：

1. **组策略注册表**（关后台自动下载/推送的核心）
   - `HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU` → `NoAutoUpdate=1`、`AUOptions=1`
   - `HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate` → `DisableOSUpgrade=1`（拦截大版本功能更新推送）
   - `HKLM\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization\Config` → `DODownloadMode=0`（关闭 P2P 后台上传/下载）
2. **服务禁用**（写注册表 `Start=4`，因 `sc config` 对受保护服务会被拒绝）
   - `wuauserv=4`、`UsoSvc=4`、`DoSvc=4`、`WaaSMedicSvc=4`
   - WaaSMedicSvc 的 Start 值默认 ACL 保护，脚本内置"取得所有权→改 ACL→写值"兜底，失败则记录并继续
   - 写完后 `Stop-Service -Force` 停止运行中的服务
3. **计划任务禁用**：枚举 `\Microsoft\Windows\WindowsUpdate\`、`\Microsoft\Windows\UpdateOrchestrator\`、`\Microsoft\Windows\WaaSMedic\` 下所有任务逐个 `schtasks /change /disable`，失败记录不中断

## 提出的变更

### 新增文件 1：`disable-winupdate.ps1`（工作区根目录）
关闭脚本。步骤：检查管理员权限 → 应用上述 3 层配置 → 停服务 → 每步输出 `[OK]/[FAIL]` 日志。**此脚本只负责改系统，不动工作区其他文件。**

### 新增文件 2：`enable-winupdate.ps1`（工作区根目录）
恢复脚本（一键回滚）：删除创建的策略键、服务 Start 恢复为探测到的原值（wuauserv=3, UsoSvc=2, DoSvc=2, WaaSMedicSvc=3）、重新启用计划任务。

### 执行方式（全自动，仅一次 UAC 交互）
```powershell
Start-Process powershell -Verb RunAs -Wait -ArgumentList '-ExecutionPolicy Bypass -File <工作区>\disable-winupdate.ps1'
```
系统会弹一次 UAC 窗口，用户点"是"后脚本自动跑完。

### 验证（只读）
- `Get-Service` 确认 4 个服务 Disabled/Stopped
- 回读注册表策略值与 Start 值
- `Get-ScheduledTask` 确认任务 Disabled
- 汇总成功/失败项向用户汇报

## 假设与决策

- **BITS 保留运行**：它是 Store 应用更新、OneDrive 等的传输通道，禁用副作用大；更新推送已由 wuauserv/UsoSvc 策略层切断，保留 BITS 不影响目标。
- **不下载第三方工具**（如 Windows Update Blocker），全部用系统原生机制。
- **需要重启**才 100% 生效（策略+服务停止即时生效，残留进程重启后清除）——由用户自行决定何时重启。
- ⚠️ **安全提醒**：关闭后系统不再接收安全补丁，Defender 病毒库自动更新也会受影响。教育版可能有组织策略强制，若被域策略覆盖会汇报失败项。
- 回滚随时可用：运行 `enable-winupdate.ps1`（同样 UAC 提权）。

## 验证步骤

1. 脚本执行结束后自动回读服务/注册表/任务状态并输出报告
2. 手动确认：打开 设置 → Windows 更新，应显示"某些设置由你的组织管理"或无法自动检查更新
3. 回滚演练：如需恢复，运行 enable 脚本后重复上述检查
