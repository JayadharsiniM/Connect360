$base = "c:\Users\jayadharsini.m\Downloads\connect360"
$shared = "$base\backend\shared"
$out = "$base\infra\lambda_packages"
$tmp = "$env:TEMP\lambda_build"

# Create output directory
New-Item -ItemType Directory -Force -Path $out | Out-Null

$lambdas = @("auth","services","workers","bookings","verification","admin")

foreach ($l in $lambdas) {
    # Clean temp
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null

    # Copy handler
    Copy-Item "$base\backend\lambdas\connect360-$l\handler.py" -Destination $tmp

    # Copy shared modules
    Copy-Item "$shared\*.py" -Destination $tmp

    # Create zip
    $zipPath = "$out\$l.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path "$tmp\*" -DestinationPath $zipPath -Force

    Write-Host "Created $l.zip"
}

Write-Host "`nAll packages created in: $out"
Get-ChildItem $out
