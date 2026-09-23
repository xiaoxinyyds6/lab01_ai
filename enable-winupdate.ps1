# ============================================================
#  enable-winupdate.ps1 - Re-enable Windows auto update (admin)
#  Usage: powershell -ExecutionPolicy Bypass -File this-file
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

Write-Host '=== Re-enable Windows Update: start ==='

# 0) admin check
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host '[FAIL] Not elevated, abort.'
  $script:log | Out-File -FilePath "$PSScriptRoot\winupdate-enable.log" -Encoding UTF8
  exit 1
}

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

# 1) Delete policy keys created by disable script (they did not exist before)
try {
  Remove-Item 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -Recurse -Force -ErrorAction Stop
  Step 'Policy key: Policies\...\WindowsUpdate removed' $true
} catch { Step 'Policy key: WindowsUpdate removal' $false $_.Exception.Message }

try {
  Remove-Item 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization' -Recurse -Force -ErrorAction Stop
  Step 'Policy key: Policies\...\DeliveryOptimization removed' $true
} catch { Step 'Policy key: DeliveryOptimization removal' $false $_.Exception.Message }

# 2) Restore service Start values to defaults observed before
$defaults = [ordered]@{
  'wuauserv'     = 3
  'UsoSvc'       = 2
  'DoSvc'        = 2
  'WaaSMedicSvc' = 3
}
foreach ($svc in $defaults.Keys) {
  if (Set-ServiceStartRobust $svc $defaults[$svc]) {
    Step "Service: $svc -> Start restored to $($defaults[$svc])" $true
  } else {
    Step "Service: $svc -> FAILED (ACL protected)" $false
  }
}

# 3) Re-enable scheduled tasks
$paths = '\Microsoft\Windows\WindowsUpdate\', '\Microsoft\Windows\UpdateOrchestrator\', '\Microsoft\Windows\WaaSMedic\'
foreach ($p in $paths) {
  $tasks = Get-ScheduledTask -TaskPath $p -ErrorAction SilentlyContinue
  if (-not $tasks) { continue }
  foreach ($t in $tasks) {
    $full = "$($t.TaskPath)$($t.TaskName)"
    try {
      Enable-ScheduledTask -TaskPath $t.TaskPath -TaskName $t.TaskName -ErrorAction Stop | Out-Null
      Step "Task: $full -> enabled" $true
    } catch { Step "Task: $full -> FAILED" $false }
  }
}

# 4) Start services
foreach ($svc in 'wuauserv', 'UsoSvc', 'DoSvc') {
  try {
    Start-Service -Name $svc -ErrorAction Stop
    Step "Start service: $svc" $true
  } catch { Step "Start service: $svc (will start on demand)" $false }
}

# 5) Summary + log
Write-Host ''
Write-Host '========== SUMMARY =========='
$script:log | ForEach-Object { Write-Host $_ }
$script:log | Out-File -FilePath "$PSScriptRoot\winupdate-enable.log" -Encoding UTF8
Write-Host ''
Write-Host 'Note: reboot is recommended.'
