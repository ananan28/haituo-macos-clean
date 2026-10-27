param([switch]$SelfTest, [switch]$CountOnly)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
function Get-ProbeResult([int]$ProcessId, [string]$Needle) {
    $root = [System.Windows.Automation.AutomationElement]::RootElement
    $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ProcessIdProperty, $ProcessId)
    $windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)
    $types = @{}; $matches = 0; $elements = 0; $truncated = $false
    foreach ($window in $windows) {
        $all = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
        foreach ($node in $all) {
            if ($elements -ge 5000) { $truncated = $true; break }
            $elements++
            try {
                $type = $node.Current.ControlType.ProgrammaticName
                if (-not $types.ContainsKey($type)) { $types[$type] = 0 }
                $types[$type]++
                if ($Needle) {
                    $name = $node.Current.Name
                    if ($name -and $name.Contains($Needle)) { $matches++; continue }
                    $pattern = $null
                    if ($node.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$pattern)) {
                        $value = ([System.Windows.Automation.ValuePattern]$pattern).Current.Value
                        if ($value -and $value.Contains($Needle)) { $matches++ }
                    }
                }
            } catch { }
        }
    }
    return [ordered]@{ processId=$ProcessId; windows=$windows.Count; accessibleElements=$elements; types=$types; testPhraseMatches=$matches; truncated=$truncated }
}
if ($SelfTest) {
    Add-Type -AssemblyName System.Windows.Forms
    $form = New-Object System.Windows.Forms.Form
    $form.Text='Viber UI diagnostic fixture'
    $label=New-Object System.Windows.Forms.Label
    $label.Text='HAITUO_UI_TEST_3827'
    $label.AutoSize=$true
    $form.Controls.Add($label)
    $form.Show(); [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 500
    try {
        $result=Get-ProbeResult $PID 'HAITUO_UI_TEST_3827'
        if ($result.windows -lt 1 -or $result.testPhraseMatches -lt 1) { throw ('Fixture failed: '+($result|ConvertTo-Json -Compress)) }
        Write-Host ('SELF_TEST_OK '+($result|ConvertTo-Json -Compress))
    } finally { $form.Close(); $form.Dispose() }
    exit 0
}
try {
    Write-Host 'Viber accessibility diagnostic: counts only; no chat text is saved or sent.'
    Write-Host 'Open Viber on this computer and open a test chat containing a unique test phrase.'
    $phrase=''
    if (-not $CountOnly) { $phrase=Read-Host 'Enter the test phrase to check locally (or press Enter to only count controls)' }
    $processes=@(Get-Process -Name Viber -ErrorAction SilentlyContinue)
    if ($processes.Count -eq 0) { throw 'Viber process not found. Start the official Viber desktop app first.' }
    $results=@(foreach ($p in $processes) { Get-ProbeResult $p.Id $phrase })
    $report=[ordered]@{ diagnostic='haituo-viber-uia-v1'; generatedAt=(Get-Date).ToString('o'); windowsVersion=[Environment]::OSVersion.Version.ToString(); phraseProvided=![string]::IsNullOrEmpty($phrase); processes=$results; note='Only UI element counts and phrase match counts are recorded. A zero match does not prove text is unavailable through other interfaces.' }
    $dir=[Environment]::GetFolderPath('Desktop')
    if (-not $dir -or -not (Test-Path $dir)) { $dir=$PSScriptRoot }
    $path=Join-Path $dir ('Haituo-Viber-UI-check-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.json')
    $report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $path -Encoding UTF8
    Write-Host ('Report saved: '+$path)
    $report | ConvertTo-Json -Depth 8 | Write-Host
} catch { Write-Host ('Diagnostic error: '+$_.Exception.Message) -ForegroundColor Red; exit 1 }
