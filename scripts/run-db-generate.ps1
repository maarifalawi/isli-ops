# Load .env.local ke environment lalu jalankan drizzle-kit generate.
# (drizzle-kit tidak auto-load .env.local; Next.js yang biasanya melakukannya.)
# Pemakaian: powershell -ExecutionPolicy Bypass -File scripts\run-db-generate.ps1 -Name iris4c_charge_line_usd
param(
    [Parameter(Mandatory = $true)]
    [string]$Name
)

$envFile = Join-Path $PSScriptRoot '..\.env.local'

# CATATAN: PowerShell TIDAK peka huruf besar/kecil pada nama variabel, jadi
# variabel loop TIDAK boleh bernama $name (akan menimpa param $Name dan membuat
# nama file migrasi salah). Pakai $envName.
foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*([^#=\s][^=]*)=(.*)$') {
        $envName = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        Set-Item -Path "Env:$envName" -Value $value
    }
}


Set-Location (Join-Path $PSScriptRoot '..')
& node_modules\.bin\drizzle-kit.cmd generate --name $Name
exit $LASTEXITCODE
