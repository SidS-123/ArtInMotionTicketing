from PIL import Image

# Load the image
img = Image.open('AIM Logo.webp')

# Convert to RGBA for transparency support
img = img.convert('RGBA')

# Get the background color (most common color in corners)
pixels = img.load()
corner_colors = [
    pixels[0, 0],  # top-left
    pixels[img.width-1, 0],  # top-right
    pixels[0, img.height-1],  # bottom-left
    pixels[img.width-1, img.height-1]  # bottom-right
]

# Find the most common color in corners (likely background)
bg_color = max(set(corner_colors), key=corner_colors.count)

# Convert background color to transparent
data = img.getdata()
new_data = []

for item in data:
    # If the color matches the background color, make it transparent
    if item[:3] == bg_color[:3]:  # Compare RGB values
        new_data.append((255, 255, 255, 0))  # Transparent white
    else:
        new_data.append(item)

img.putdata(new_data)

# Save as PNG to preserve transparency
img.save('AIM Logo.png')
print("✓ Background removed! Saved as 'AIM Logo.png'")
