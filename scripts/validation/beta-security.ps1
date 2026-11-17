param([switch]$Configure, [switch]$Renew)
$ErrorActionPreference = 'Stop'
$vault = Join-Path $env:LOCALAPPDATA 'NONA\test-recipe'
$names = @('NONA_TEST_KEY','NONA_TEST_A_EMAIL','NONA_TEST_A_PASSWORD','NONA_TEST_B_EMAIL','NONA_TEST_B_PASSWORD')
if ($Renew) {
  $testOrigin = 'https://mhhtnqfdkyudwyqlmnce.supabase.co'
  $managerIds = @{
    A = '51bd1bd9-e686-4e45-963d-dda110cda7e0'
    B = '20da8d91-b920-4b38-a0ec-65afd3c8110e'
  }
  $admin = [Net.NetworkCredential]::new('', (Read-Host 'Clé secrète Supabase du projet TEST (saisie masquée)' -AsSecureString)).Password
  if (!$admin.StartsWith('sb_secret_')) { throw 'Une clé secrète Supabase moderne est requise.' }
  try {
    New-Item -ItemType Directory -Force -Path $vault | Out-Null
    foreach ($label in @('A','B')) {
      $uri = "$testOrigin/auth/v1/admin/users/$($managerIds[$label])"
      $headers = @{ apikey = $admin }
      $user = Invoke-RestMethod -UserAgent "NONA-TEST-Recipe/1.0" -Uri $uri -Headers $headers -MaximumRedirection 0
      if ($user.id -ne $managerIds[$label] -or $user.email -notlike 'nona-pilot-*@example.invalid') {
        throw "Le compte $label ne correspond pas à la recette."
      }
      $password = 'Nona!' + [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
      try {
        $null = Invoke-RestMethod -UserAgent "NONA-TEST-Recipe/1.0" -Uri $uri -Method Put -Headers $headers -MaximumRedirection 0 -ContentType 'application/json' -Body (@{ password = $password } | ConvertTo-Json -Compress)
      } catch {
        throw "Le renouvellement du compte $label a échoué. Vérifier la clé TEST et les droits Auth."
      }
      foreach ($entry in @{ EMAIL = $user.email; PASSWORD = $password }.GetEnumerator()) {
        ConvertTo-SecureString $entry.Value -AsPlainText -Force | ConvertFrom-SecureString |
          Set-Content -LiteralPath (Join-Path $vault "NONA_TEST_${label}_$($entry.Key)")
      }
      Write-Host "Compte fictif $label renouvelé et enregistré."
    }
  } finally {
    $headers = $null
    $password = $null
    $admin = $null
  }
}
if ($Configure) {
  New-Item -ItemType Directory -Force -Path $vault | Out-Null
  $configureNames = if ($Renew) { @('NONA_TEST_KEY') } else { $names }
  foreach ($name in $configureNames) {
    Read-Host $name -AsSecureString | ConvertFrom-SecureString |
      Set-Content -LiteralPath (Join-Path $vault $name)
  }
}
try {
  foreach ($name in $names) {
    $path = Join-Path $vault $name
    if (!(Test-Path -LiteralPath $path)) { throw "Missing Windows-protected recipe credentials. Run with -Configure." }
    $secure = Get-Content -LiteralPath $path | ConvertTo-SecureString
    [Environment]::SetEnvironmentVariable($name, [Net.NetworkCredential]::new('', $secure).Password, 'Process')
  }
  node (Join-Path $PSScriptRoot 'beta-security.mjs')
  exit $LASTEXITCODE
} finally {
  foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }
}
