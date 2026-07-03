param([string]$Message = "")

$dataFile = "src/data/changelog.ts"
$content = Get-Content $dataFile -Raw

$lastVersion = "0.0.0"
if ($content -match 'version:\s+"([^"]+)"') {
  $lastVersion = $matches[1]
}

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

$highlights = @()
$fixes = @()
$other = @()

foreach ($line in $log) {
  $msg = $line -replace '^[a-f0-9]+\s+', ''
  if ($msg -match '^fix[(:]') {
    $clean = $msg -replace '^fix(\([^)]*\))?:\s*', ''
    # Rewrite internal tech references to user-safe language
    $clean = $clean -replace '(?i)\b(supabase|prisma|redis|webpack|turbopack|postgres|sql)\b.*', 'backend improvements'
    $fixes += $clean
  } else {
    $clean = $msg -replace '^(feat|chore|refactor|improve|perf|style|docs)(\([^)]*\))?:\s*', ''
    $clean = $clean -replace '(?i)\b(supabase|prisma|redis|webpack|turbopack|postgres|sql|stream|getstream)\b.*', 'platform improvements'
    $highlights += $clean
  }
}

$parts = $lastVersion -split '\.'
$patch = [int]$parts[2] + 1
$newVersion = "$($parts[0]).$($parts[1]).$patch"

$today = Get-Date -Format "MMMM dd, yyyy"
$title = if ($Message) { $Message } else { "New update" }
$desc = "What's new in this release."
if ($highlights.Count -gt 0) {
  $desc = $highlights[0]
}

$hlLines = ($highlights | ForEach-Object { "      `"$_`"," }) -join "`n"
$fixLines = ($fixes | ForEach-Object { "      `"$_`"," }) -join "`n"

$newEntry = @"
  {
    version: "$newVersion",
    date: "$today",
    title: "$title",
    description: "$desc",
    highlights: [
$hlLines
    ],
    fixes: [
$fixLines
    ],
  },
"@

$newContent = $content -replace '(export const changelog: ChangelogEntry\[\] = \[)', "`$1`n$newEntry"

$newContent | Set-Content $dataFile

Write-Host "`n✅ Changelog draft created for v$newVersion"
Write-Host "   File: $dataFile"
Write-Host "`n📝 Open it and rewrite the descriptions in your own words!"
Write-Host "   Then: git add src/data/changelog.ts && git commit -m 'chore: update changelog'`n"
