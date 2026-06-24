param([string]$Message = "")

# Get last version from changelog.ts
$dataFile = "src/data/changelog.ts"
$content = Get-Content $dataFile -Raw

$lastVersion = "0.0.0"
if ($content -match 'version:\s+"([^"]+)"') {
  $lastVersion = $matches[1]
}

# Get commits since last tag matching that version, or use a reasonable default
$since = "1 week ago"
try {
  $tagCheck = git tag -l "v$lastVersion" 2>$null
  if ($tagCheck) {
    $since = "v$lastVersion"
  }
} catch {}

$log = git log --oneline --no-decorate "$since..HEAD" 2>$null
if (-not $log) {
  $log = git log --oneline --no-decorate -20 2>$null
}

$features = @()
$improvements = @()
$fixes = @()
$other = @()

foreach ($line in $log) {
  $msg = $line -replace '^[a-f0-9]+\s+', ''
  if ($msg -match '^feat[(:]') {
    $clean = $msg -replace '^feat(\([^)]*\))?:\s*', ''
    $features += $clean
  } elseif ($msg -match '^fix[(:]') {
    $clean = $msg -replace '^fix(\([^)]*\))?:\s*', ''
    $fixes += $clean
  } elseif ($msg -match '^(chore|refactor|improve|perf)') {
    $clean = $msg -replace '^(chore|refactor|improve|perf)(\([^)]*\))?:\s*', ''
    $improvements += $clean
  } else {
    $other += $msg
  }
}

# Bump version (simple patch bump)
$parts = $lastVersion -split '\.'
$patch = [int]$parts[2] + 1
$newVersion = "$($parts[0]).$($parts[1]).$patch"

$today = Get-Date -Format "MMMM dd, yyyy"

$title = if ($Message) { $Message } else { "New update" }

$summary = "What's new in this release."
if ($features.Count -gt 0) {
  $summary = "$($features[0])"
}

$newEntry = @"
  {
    version: "$newVersion",
    date: "$today",
    title: "$title",
    summary: "$summary",
    features: [
$(($features | ForEach-Object { "      `"$_`"," }) -join "`n")
    ],
    improvements: [
$(($improvements | ForEach-Object { "      `"$_`"," }) -join "`n")
    ],
    fixes: [
$(($fixes | ForEach-Object { "      `"$_`"," }) -join "`n")
    ],
  },
"@

# Insert after the opening array
$newContent = $content -replace '(export const changelog: ChangelogEntry\[\] = \[)', "`$1`n$newEntry"

$newContent | Set-Content $dataFile

Write-Host "`n✅ Changelog draft created for v$newVersion"
Write-Host "   File: $dataFile"
Write-Host "`n📝 Open it and personalize the descriptions before committing!"
Write-Host "   Then run: git add src/data/changelog.ts && git commit -m 'chore: update changelog'`n"
