# ============================================================
#  disable-winupdate.ps1 - Disable Windows auto update (admin)
#  Usage: powershell -ExecutionPolicy Bypass -File this-file
#  Rollback: run enable-winupdate.ps1
# ============================================================
$ErrorActionPreference = 'Continue'
$script:log = @()
function Step($name, $ok, $extra) {
  $mark = if ($ok) { '[OK]  ' } else { '[FAIL]' }
  $line = "$mark $name"
  if ($extra) { $line = "$line -- $extra" }
  Write-Host $line
  $script:log += $line
}

Write-Host '=== Disable Windows Update: start ==='

# 0) admin check
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host '[FAIL] Not elevated, abort.'
  $script:log += '[FAIL] Not elevated, abort.'
  $script:log | Out-File -FilePath "$PSScriptRoot\winupdate-disable.log" -Encoding UTF8
  exit 1
}

# Robust: write service Start value, with ACL ownership fallback
function Set-ServiceStartRobust($svc, [int]$value) {
  $key = "HKLM:\SYSTEM\CurrentControlSet\Services\$svc"
  try {
    Set-ItemProperty -Path $key -Name Start -Value $value -Type DWord -ErrorAction Stop
    return $true
  } catch {
    try {
      $admin = New-Object Security.Principal.NTAccount('BUILTIN', 'Administrators')
      $rk = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey(
        "SYSTEM\CurrentControlSet\Services\$svc",
        [Microsoft.Win32.RegistryKeyPermissionCheck]::ReadWriteSubTree,
        [System.Security.AccessControl.RegistryRights]::TakeOwnership)
      if ($null -eq $rk) { return $false }
      $acl = $rk.GetAccessControl()
      $acl.SetOwner($admin)
      $rk.SetAccessControl($acl)
      $rk.Close()
      $rk2 = [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey("SYSTEM\CurrentControlSet\Services\$svc", $true)
      if ($null -eq $rk2) { return $false }
      $acl2 = $rk2.GetAccessControl()
      $rule = New-Object Security.AccessControl.RegistryAccessRule($admin, 'FullControl', 'ContainerInherit', 'None', 'Allow')
      $acl2.AddAccessRule($rule)
      $rk2.SetAccessControl($acl2)
      $rk2.SetValue('Start', $value, [Microsoft.Win32.RegistryValueKind]::DWord)
      $rk2.Close()
      return $true
    } catch {
      return $false
    }
  }
}

# 1) Group policy registry keys - core switch for background auto update
try {
  $au = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU'
  New-Item -Path $au -Force | Out-Null
  Set-ItemProperty -Path $au -Name NoAutoUpdate -Value 1 -Type DWord -ErrorAction Stop
  Set-ItemProperty -Path $au -Name AUOptions -Value 1 -Type DWord -ErrorAction Stop
  Step 'Policy: NoAutoUpdate=1 / AUOptions=1 (disable auto update)' $true
} catch { Step 'Policy: NoAutoUpdate' $false $_.Exception.Message }

try {
  $wu = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate'
  New-Item -Path $wu -Force | Out-Null
  Set-ItemProperty -Path $wu -Name DisableOSUpgrade -Value 1 -Type DWord -ErrorAction Stop
  Step 'Policy: DisableOSUpgrade=1 (block feature update push)' $true
} catch { Step 'Policy: DisableOSUpgrade' $false $_.Exception.Message }

try {
  $do = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization\Config'
  New-Item -Path $do -Force | Out-Null
  Set-ItemProperty -Path $do -Name DODownloadMode -Value 0 -Type DWord -ErrorAction Stop
  Step 'Policy: DODownloadMode=0 (disable Delivery Optimization P2P)' $true
} catch { Step 'Policy: DODownloadMode' $false $_.Exception.Message }

# 2) Disable services via registry Start=4
$targets = [ordered]@{
  'wuauserv'     = 'Windows Update'
  'UsoSvc'       = 'Update Orchestrator'
  'DoSvc'        = 'Delivery Optimization'
  'WaaSMedicSvc' = 'WaaSMedic (prevents re-enable)'
}
foreach ($svc in $targets.Keys) {
  if (Set-ServiceStartRobust $svc 4) {
    Step "Service: $($targets[$svc]) ($svc) -> disabled" $true
  } else {
    Step "Service: $($targets[$svc]) ($svc) -> FAILED (ACL protected)" $false
  }
}

# 3) Stop running update services
foreach ($svc in 'wuauserv', 'UsoSvc', 'DoSvc') {
  try {
    Stop-Service -Name $svc -Force -ErrorAction Stop
    Step "Stop service: $svc" $true
  } catch { Step "Stop service: $svc (already stopped or protected)" $false }
}

# 4) Disable update related scheduled tasks (log failures, keep going)
$paths = '\Microsoft\Windows\WindowsUpdate\', '\Microsoft\Windows\UpdateOrchestrator\', '\Microsoft\Windows\WaaSMedic\'
foreach ($p in $paths) {
  $tasks = Get-ScheduledTask -TaskPath $p -ErrorAction SilentlyContinue
  if (-not $tasks) { continue }
  foreach ($t in $tasks) {
    $full = "$($t.TaskPath)$($t.TaskName)"
    try {
      Disable-ScheduledTask -TaskPath $t.TaskPath -TaskName $t.TaskName -ErrorAction Stop | Out-Null
      Step "Task: $full -> disabled" $true
    } catch {
      Step "Task: $full -> FAILED (OS protected, does not affect main goal)" $false
    }
  }
}

# 5) Summary + log
Write-Host ''
Write-Host '========== SUMMARY =========='
$script:log | ForEach-Object { Write-Host $_ }
$script:log | Out-File -FilePath "$PSScriptRoot\winupdate-disable.log" -Encoding UTF8
Write-Host ''
Write-Host 'Note: reboot is recommended to fully apply. Rollback: enable-winupdate.ps1'
