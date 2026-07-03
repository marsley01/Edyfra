import os
import hashlib
from collections import defaultdict

# Directories to ignore
IGNORE_DIRS = {
    '.git', 'node_modules', '.next', '.vercel', '.kilo', '.vscode', '.cursor', 
    '__pycache__', '.codex-push-previous'
}
# File names or extensions to ignore if they are generic or large auto-generated
IGNORE_FILES = {'package-lock.json', 'skills-lock.json', '.env.example', 'pnpm-lock.yaml', 'yarn.lock'}

def get_file_hash(filepath):
    hasher = hashlib.sha256()
    try:
        with open(filepath, 'rb') as f:
            while chunk := f.read(8192):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception as e:
        return None

def scan_project(root_dir):
    by_hash = defaultdict(list)
    by_name = defaultdict(list)
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Prune ignored directories in-place so os.walk doesn't traverse them
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        
        for filename in filenames:
            if filename in IGNORE_FILES:
                continue
            
            filepath = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(filepath, root_dir)
            
            # Group by file hash (exact content duplicates)
            try:
                size = os.path.getsize(filepath)
                if size > 50 * 1024 * 1024:
                    continue
            except Exception:
                continue
                
            file_hash = get_file_hash(filepath)
            if file_hash:
                by_hash[file_hash].append((rel_path, size))
                
            # Group by name (case-insensitive)
            by_name[filename.lower()].append(rel_path)
            
    return by_hash, by_name

if __name__ == '__main__':
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    print(f"Scanning directory: {root_dir} (excluding backup dirs like .codex-push-previous)")
    by_hash, by_name = scan_project(root_dir)
    
    print("\n=== EXACT DUPLICATES (Same Content Hash) ===")
    exact_duplicates_found = False
    for fhash, paths in by_hash.items():
        if len(paths) > 1:
            exact_duplicates_found = True
            size = paths[0][1]
            size_str = f"{size / 1024:.2f} KB" if size < 1024 * 1024 else f"{size / (1024 * 1024):.2f} MB"
            print(f"\nHash: {fhash[:12]}... (Size: {size_str})")
            for path, _ in paths:
                print(f"  - {path}")
                
    if not exact_duplicates_found:
        print("No exact duplicate files found.")
        
    print("\n=== NAME DUPLICATES (Same Filename in Different Paths) ===")
    name_duplicates_found = False
    for name, paths in by_name.items():
        # Filter down name duplicates to only those that actually exist in multiple paths
        if len(paths) > 1:
            # Let's verify if they are not all identical in hash.
            # (If they have different hashes, they might be different files with the same name, which is important to look at).
            name_duplicates_found = True
            print(f"\nFilename: {paths[0].split(os.sep)[-1]}")
            for path in paths:
                print(f"  - {path}")
                
    if not name_duplicates_found:
        print("No duplicate filenames found.")
