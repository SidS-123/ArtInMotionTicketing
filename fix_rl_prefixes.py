import re
import json

# Read the file
json_file = 'c:\\Users\\uomsw\\Desktop\\VSCODE\\ArtInMotionTicketing\\user_page\\final-seatmap.json'
with open(json_file, 'r') as f:
    content = f.read()

# Parse the JSON
data = json.loads(content)

# Process each seat
for seat in data:
    seat_id = seat['id']
    
    # Handle special case for RR and LL - remove one letter
    if seat_id.startswith('RR-'):
        seat['id'] = 'R-' + seat_id[3:]
    elif seat_id.startswith('LL-'):
        seat['id'] = 'L-' + seat_id[3:]
    # Handle all other two-letter prefixes starting with R or L
    elif len(seat_id) >= 2 and seat_id[0] in ['R', 'L'] and seat_id[1] not in ['-', '0','1','2','3','4','5','6','7','8','9']:
        # Remove first letter (R or L)
        seat['id'] = seat_id[1:]

# Write back the file
with open(json_file, 'w') as f:
    json.dump(data, f, indent=4)

print("Successfully removed R/L prefixes from seat IDs")
