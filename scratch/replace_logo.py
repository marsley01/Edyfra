import os
import re

files_to_update = [
    'src/components/navigation.tsx',
    'src/components/footer.tsx',
    'src/components/dashboard/Sidebar.tsx',
    'src/components/dashboard/MobileNav.tsx',
    'src/app/tutor/layout.tsx',
    'src/app/signup/page.tsx',
    'src/app/login/page.tsx',
]

pattern = re.compile(r'<div[^>]*?>\s*<GraduationCap[^>]*?>\s*</div>', re.MULTILINE | re.DOTALL)
replacement = '<img src="/icon.png" alt="Edyfra Logo" className="w-9 h-9 rounded-xl shadow-lg object-cover" />'

for file in files_to_update:
    if not os.path.exists(file): 
        print(f"Skipping {file}, does not exist")
        continue
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content, count = pattern.subn(replacement, content)
    
    if count > 0:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {count} occurrences in {file}")
    else:
        print(f"No match found in {file}")

print("Done")
