param(
  [Parameter(Mandatory = $false)]
  [string]$LocalUri = "mongodb://localhost:27017",

  [Parameter(Mandatory = $false)]
  [string]$LocalDb = "inventory_db",

  # Provide via -AtlasUri "..." OR environment variable ATLAS_URI
  [Parameter(Mandatory = $false)]
  [string]$AtlasUri = $env:ATLAS_URI,

  [Parameter(Mandatory = $false)]
  [string]$AtlasDb = "inventory_db",

  # Folder to write a compressed archive backup into
  [Parameter(Mandatory = $false)]
  [string]$OutDir = (Join-Path $PSScriptRoot "..\..\tmp"),

  # If set, drops existing collections in the target db before restoring
  [Parameter(Mandatory = $false)]
  [switch]$DropTarget,

  # If set, keeps the archive file after restore
  [Parameter(Mandatory = $false)]
  [switch]$KeepBackup
)

$ErrorActionPreference = "Stop"

function Require-Command([string]$name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Required command '$name' not found. Install MongoDB Database Tools (mongodump/mongorestore) or use the Docker fallback in MIGRATION.md."
  }
}

if (-not $AtlasUri) {
  throw "AtlasUri is required. Provide -AtlasUri or set environment variable ATLAS_URI."
}

Require-Command "mongodump"
Require-Command "mongorestore"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$archivePath = Join-Path $OutDir ("{0}_{1}.archive.gz" -f $LocalDb, $timestamp)

Write-Host "Dumping local database '$LocalDb' from $LocalUri ..." -ForegroundColor Cyan
& mongodump --uri ("{0}/{1}" -f $LocalUri.TrimEnd('/'), $LocalDb) --archive=$archivePath --gzip

Write-Host "Dump created: $archivePath" -ForegroundColor Green

$restoreArgs = @(
  "--uri=$AtlasUri",
  "--archive=$archivePath",
  "--gzip",
  "--nsInclude=$LocalDb.*"
)

# If you want to rename the database during restore, map namespaces.
if ($AtlasDb -ne $LocalDb) {
  $restoreArgs += "--nsFrom=$LocalDb.*"
  $restoreArgs += "--nsTo=$AtlasDb.*"
}

if ($DropTarget.IsPresent) {
  $restoreArgs += "--drop"
}

Write-Host "Restoring into Atlas (db '$AtlasDb')..." -ForegroundColor Cyan
& mongorestore @restoreArgs

Write-Host "Restore complete." -ForegroundColor Green

if (-not $KeepBackup.IsPresent) {
  Remove-Item -Force $archivePath
  Write-Host "Removed backup archive (use -KeepBackup to keep it)." -ForegroundColor DarkGray
}
