import re

json_file = 'c:\\Users\\uomsw\\Desktop\\VSCODE\\ArtInMotionTicketing\\user_page\\final-seatmap.json'

# Read file
with open(json_file, 'r', encoding='utf-8') as f:
    content = f.read()

# List of replacements: (find, replace)
replacements = [
    ('"LT-', '"T-'),
    ('"LR-', '"R-'),
    ('"RQ-', '"Q-'),
    ('"LQ-', '"Q-'),
    ('"RP-', '"P-'),
    ('"LP-', '"P-'),
    ('"RO-', '"O-'),
    ('"LO-', '"O-'),
    ('"RN-', '"N-'),
    ('"LN-', '"N-'),
    ('"RM-', '"M-'),
    ('"LM-', '"M-'),
    ('"RL-', '"L-'),
    ('"RB-', '"B-'),
    ('"LB-', '"B-'),
    ('"RC-', '"C-'),
    ('"LC-', '"C-'),
    ('"RA-', '"A-'),
    ('"LA-', '"A-'),
]

# Apply all replacements
for find, replace in replacements:
    content = content.replace(find, replace)

# Write back
with open(json_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("All R/L prefixes have been removed successfully!")
