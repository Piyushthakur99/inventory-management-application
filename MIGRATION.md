# Migrate local MongoDB (Compass) data to MongoDB Atlas

Your screenshots show your data is in **local MongoDB** (`localhost:27017`), not Atlas.

This guide migrates your existing database (default: `inventory_db`) from local → Atlas.

## Option 1 (recommended): `mongodump` + `mongorestore`

### Prerequisites

- You need **MongoDB Database Tools** installed (commands: `mongodump`, `mongorestore`).
  - If you don’t have them, use Option 2 (Docker fallback).

### Step 1: Get your Atlas connection string

Use a URI like:

`mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/inventory_db?retryWrites=true&w=majority&appName=Cluster0`

- Use a password with only letters/numbers to avoid URL-encoding.

### Step 2: Run the migration script

From the project root:

```powershell
$env:ATLAS_URI = "mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/inventory_db?retryWrites=true&w=majority&appName=Cluster0"

# Migrate local inventory_db -> Atlas inventory_db
.\backend\scripts\migrate-local-to-atlas.ps1

# If you want to overwrite the target database completely, add -DropTarget
# .\backend\scripts\migrate-local-to-atlas.ps1 -DropTarget
```

### Step 3: Verify

- Atlas UI → Browse Collections → `inventory_db` should show collections + documents.
- Compass: create a second connection using the Atlas `mongodb+srv://...` URI and confirm the same collections exist.

## Option 2: Docker fallback (no local MongoDB tools)

If you don’t have `mongodump`/`mongorestore` locally, you can run them inside a MongoDB container.

1) Dump from local:

```powershell
$dumpFile = "$PWD\inventory_db.archive.gz"

docker run --rm -v "${PWD}:/work" mongo:7 mongodump `
  --uri "mongodb://host.docker.internal:27017/inventory_db" `
  --archive=/work/inventory_db.archive.gz --gzip
```

2) Restore into Atlas:

```powershell
$env:ATLAS_URI = "mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/inventory_db?retryWrites=true&w=majority&appName=Cluster0"

docker run --rm -v "${PWD}:/work" mongo:7 mongorestore `
  --uri "$env:ATLAS_URI" `
  --archive=/work/inventory_db.archive.gz --gzip
```

(If you need to overwrite existing collections in Atlas, add `--drop` to the `mongorestore` command.)
