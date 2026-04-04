import os
import re
import sys
import subprocess


#============================================
# Allowlists for parts to extract
ALLOWED_EYES = ['default', 'happy', 'squint', 'surprised', 'side', 'wink']
ALLOWED_EYEBROWS = ['default', 'defaultNatural', 'flatNatural', 'raisedExcited', 'unibrowNatural']
ALLOWED_MOUTHS = ['default', 'smile', 'serious', 'twinkle', 'sad']
ALLOWED_HAIR = ['bigHair', 'bob', 'bun', 'curly', 'dreads01', 'frizzle', 'shaggyMullet', 'shortCurly', 'shortFlat', 'shortWaved']
ALLOWED_FACIAL_HAIR = ['beardLight', 'beardMedium', 'moustacheFancy']
ALLOWED_ACCESSORIES = ['prescription01', 'prescription02', 'sunglasses']

# Skin hex colors to replace with placeholder
SKIN_COLORS = ['#FD9841', '#F9D562', '#FFDBB4', '#EDB98A', '#D08B5B', '#AE5D29', '#614335']

#============================================
def get_repo_root():
	result = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True)
	return result.stdout.strip()

#============================================
def extract_svg_from_template_literal(match_str):
	# Extract content between backticks in template literal
	# The match_str contains: `CONTENT`
	# Remove outer backticks and handle escaped backticks
	if not match_str.startswith('`') or not match_str.endswith('`'):
		return None
	content = match_str[1:-1]
	return content

#============================================
def find_category_blocks(js_content):
	# Find each category block within paths: { ... }
	# Returns dict of category_name -> block_content
	paths_start = js_content.find('paths: {')
	if paths_start == -1:
		return {}

	# Find the closing brace for paths object
	brace_count = 0
	in_block = False
	paths_end = paths_start + len('paths: {')

	for i in range(paths_start, len(js_content)):
		if js_content[i] == '{':
			brace_count += 1
			in_block = True
		elif js_content[i] == '}':
			brace_count -= 1
			if in_block and brace_count == 0:
				paths_end = i
				break

	paths_block = js_content[paths_start:paths_end + 1]
	return paths_block

#============================================
def extract_category_entries(paths_block, category_name):
	# Find entries within a category like: eyes: { ... }
	category_pattern = category_name + r':\s*\{'
	match = re.search(category_pattern, paths_block)
	if not match:
		return {}

	# Find the closing brace for this category
	start = match.end()
	brace_count = 0
	end = start

	for i in range(start, len(paths_block)):
		if paths_block[i] == '{':
			brace_count += 1
		elif paths_block[i] == '}':
			if brace_count == 0:
				end = i
				break
			brace_count -= 1

	category_content = paths_block[start:end]

	# Extract individual entries: partName: (params) => `SVG_CONTENT`
	entries = {}

	# Pattern to match: identifier: (params) => `...`
	# We need to carefully extract backtick-delimited content
	entry_pattern = r'(\w+)\s*:\s*\([^)]*\)\s*=>\s*`'

	for entry_match in re.finditer(entry_pattern, category_content):
		part_name = entry_match.group(1)
		backtick_start = entry_match.end() - 1  # Position of opening backtick

		# Find matching closing backtick (handling nested quotes but not backticks)
		backtick_end = backtick_start + 1
		escaped = False
		for i in range(backtick_start + 1, len(category_content)):
			if category_content[i] == '\\' and not escaped:
				escaped = True
				continue
			if category_content[i] == '`' and not escaped:
				backtick_end = i
				break
			escaped = False

		svg_content = category_content[backtick_start + 1:backtick_end]
		entries[part_name] = svg_content

	return entries

#============================================
def apply_color_replacements(svg_str, category_name):
	# Apply color replacements based on category
	result = svg_str

	if category_name == 'skin':
		# Replace all skin hex colors with placeholder
		for skin_hex in SKIN_COLORS:
			result = result.replace(skin_hex, 'SKIN_PLACEHOLDER')
		# Replace ${color} with SKIN_PLACEHOLDER
		result = result.replace('${color}', 'SKIN_PLACEHOLDER')

	elif category_name == 'facialHair':
		# Replace ${color} with HAIR_PLACEHOLDER
		result = result.replace('${color}', 'HAIR_PLACEHOLDER')

	elif category_name == 'top':
		# Replace ${hairColor} with HAIR_PLACEHOLDER
		result = result.replace('${hairColor}', 'HAIR_PLACEHOLDER')
		# Replace ${hatColor} with literal gray (ignored for headshots)
		result = result.replace('${hatColor}', '#262E33')
		# Also replace skin hex values in hair styles
		for skin_hex in SKIN_COLORS:
			result = result.replace(skin_hex, 'SKIN_PLACEHOLDER')

	elif category_name == 'accessories':
		# Replace ${color} with literal gray
		result = result.replace('${color}', '#929598')

	# Generic: replace template literals in other categories if any
	result = result.replace('${color}', '#929598')

	return result

#============================================
def extract_colors(js_content):
	# Extract color palettes from colors: { ... }
	colors_match = re.search(r'colors:\s*\{', js_content)
	if not colors_match:
		return {}, {}, {}

	# Find closing brace for colors object
	start = colors_match.end()
	brace_count = 0
	end = start
	for i in range(start, len(js_content)):
		if js_content[i] == '{':
			brace_count += 1
		elif js_content[i] == '}':
			if brace_count == 0:
				end = i
				break
			brace_count -= 1

	colors_block = js_content[start:end]

	# Extract each color category
	hair_colors = {}
	skin_colors = {}
	palette_colors = {}

	# Extract hair colors
	hair_match = re.search(r'hair:\s*\{([^}]+)\}', colors_block)
	if hair_match:
		for line in hair_match.group(1).split('\n'):
			color_match = re.search(r'(\w+):\s*[\'"]([#\w]+)[\'"]', line)
			if color_match:
				hair_colors[color_match.group(1)] = color_match.group(2)

	# Extract skin colors
	skin_match = re.search(r'skin:\s*\{([^}]+)\}', colors_block)
	if skin_match:
		for line in skin_match.group(1).split('\n'):
			color_match = re.search(r'(\w+):\s*[\'"]([#\w]+)[\'"]', line)
			if color_match:
				skin_colors[color_match.group(1)] = color_match.group(2)

	return hair_colors, skin_colors, palette_colors

#============================================
def generate_typescript_output(all_parts, hair_colors, skin_colors):
	# Generate TypeScript file content
	lines = []

	lines.append('// Auto-generated by tools/extract_avataaars.py -- do not edit manually')
	lines.append('// Source: AvataaarsJs (MIT license, Pablo Stanley & Fang-Pen Lin)')
	lines.append('')
	lines.append('//' + '='*40)
	lines.append('// Skin tone palette')
	lines.append('export const SKIN_TONES: Record<string, string> = {')
	for name, color in skin_colors.items():
		lines.append(f'\t{name}: \'{color}\',')
	lines.append('};')
	lines.append('')

	lines.append('//' + '='*40)
	lines.append('// Hair color palette')
	lines.append('export const HAIR_COLORS: Record<string, string> = {')
	for name, color in hair_colors.items():
		lines.append(f'\t{name}: \'{color}\',')
	lines.append('};')
	lines.append('')

	lines.append('//' + '='*40)
	lines.append('// Layer positions (translate x, y within viewBox 0 0 280 280)')
	lines.append('export const LAYER_POSITIONS: Record<string, [number, number]> = {')
	positions = {
		'skin': [40, 36],
		'clothing': [8, 170],
		'mouth': [86, 134],
		'nose': [112, 122],
		'eyes': [84, 90],
		'eyebrows': [84, 82],
		'top': [7, 0],
		'facialHair': [56, 72],
		'accessories': [69, 85],
	}
	for category, pos in positions.items():
		lines.append(f'\t{category}: [{pos[0]}, {pos[1]}],')
	lines.append('};')
	lines.append('')

	lines.append('//' + '='*40)
	lines.append('// SVG part paths by category')

	# Generate exports for each category
	export_names = {
		'skin': 'FACE_SHAPES',
		'nose': 'NOSES',
		'eyes': 'EYES',
		'eyebrows': 'EYEBROWS',
		'mouth': 'MOUTHS',
		'top': 'HAIR_STYLES',
		'facialHair': 'FACIAL_HAIR',
		'accessories': 'ACCESSORIES',
	}

	for category, parts in all_parts.items():
		if not parts:
			continue

		export_name = export_names.get(category, category.upper())
		lines.append(f'export const {export_name}: Record<string, string> = {{')

		for part_name, svg_content in parts.items():
			# Escape backticks and special chars in svg_content
			svg_escaped = svg_content.replace('\\', '\\\\').replace('`', '\\`')
			# Compact whitespace but preserve structure
			svg_escaped = re.sub(r'\s+', ' ', svg_escaped).strip()
			lines.append(f'\t{part_name}: `{svg_escaped}`,')

		lines.append('};')
		lines.append('')

	return '\n'.join(lines)

#============================================
def main():
	repo_root = get_repo_root()
	default_source = os.path.join(repo_root, 'tools/avataaars_source/avataaars.js')

	source_file = sys.argv[1] if len(sys.argv) > 1 else default_source

	if not os.path.exists(source_file):
		print(f'Error: Source file not found: {source_file}')
		return

	# Read the JS file
	with open(source_file, 'r') as f:
		js_content = f.read()

	# Extract colors
	hair_colors, skin_colors, _ = extract_colors(js_content)

	# Extract paths block
	paths_block = find_category_blocks(js_content)

	# Extract parts by category
	all_parts = {}

	# Eyes
	eye_entries = extract_category_entries(paths_block, 'eyes')
	eyes = {}
	for name, svg in eye_entries.items():
		if name in ALLOWED_EYES or name == 'none':
			eyes[name] = apply_color_replacements(svg, 'eyes')
	all_parts['eyes'] = eyes

	# Eyebrows
	eyebrow_entries = extract_category_entries(paths_block, 'eyebrows')
	eyebrows = {}
	for name, svg in eyebrow_entries.items():
		if name in ALLOWED_EYEBROWS or name == 'none':
			eyebrows[name] = apply_color_replacements(svg, 'eyebrows')
	all_parts['eyebrows'] = eyebrows

	# Mouths
	mouth_entries = extract_category_entries(paths_block, 'mouth')
	mouths = {}
	for name, svg in mouth_entries.items():
		if name in ALLOWED_MOUTHS or name == 'none':
			mouths[name] = apply_color_replacements(svg, 'mouth')
	all_parts['mouth'] = mouths

	# Hair/Top
	top_entries = extract_category_entries(paths_block, 'top')
	hair = {}
	for name, svg in top_entries.items():
		if name in ALLOWED_HAIR or name == 'none':
			hair[name] = apply_color_replacements(svg, 'top')
	all_parts['top'] = hair

	# Facial Hair
	facial_entries = extract_category_entries(paths_block, 'facialHair')
	facial = {}
	for name, svg in facial_entries.items():
		if name in ALLOWED_FACIAL_HAIR or name == 'none':
			facial[name] = apply_color_replacements(svg, 'facialHair')
	all_parts['facialHair'] = facial

	# Accessories
	accessory_entries = extract_category_entries(paths_block, 'accessories')
	accessories = {}
	for name, svg in accessory_entries.items():
		if name in ALLOWED_ACCESSORIES or name == 'none':
			accessories[name] = apply_color_replacements(svg, 'accessories')
	all_parts['accessories'] = accessories

	# Nose
	nose_entries = extract_category_entries(paths_block, 'nose')
	all_parts['nose'] = {name: apply_color_replacements(svg, 'nose') for name, svg in nose_entries.items()}

	# Skin
	skin_entries = extract_category_entries(paths_block, 'skin')
	all_parts['skin'] = {name: apply_color_replacements(svg, 'skin') for name, svg in skin_entries.items()}

	# Generate TypeScript output
	ts_output = generate_typescript_output(all_parts, hair_colors, skin_colors)

	# Write output file
	output_file = os.path.join(repo_root, 'src/data/avatar_parts.ts')
	with open(output_file, 'w') as f:
		f.write(ts_output)

	# Print summary
	print(f'Extraction complete. Output written to {output_file}')
	print('Extracted:')
	for category, parts in all_parts.items():
		print(f'  {category}: {len(parts)} parts')
	print(f'Hair colors: {len(hair_colors)}')
	print(f'Skin colors: {len(skin_colors)}')

#============================================
if __name__ == '__main__':
	main()
