// src/lib/utils/colorUtils.ts

const COLOR_TO_HEX: { [key: string]: string | string[] } = {
    'pink': '#ffc0cb',
    'black': '#000000',
    'white': '#ffffff',
    'yellow': '#ffff00',
    'purple': '#800080',
    'red': '#ff0000',
    'blue': '#0000ff',
    'green': '#008000',
    'orange': '#ffa500',
    'gray': '#808080',
    'grey': '#808080',
    'brown': '#a52a2a',
    'cyan': '#00ffff',
    'magenta': '#ff00ff',
    'lime': '#00ff00',
    'navy': '#000080',
    'teal': '#008080',
    'silver': '#c0c0c0',
    'gold': '#ffd700',
    'mint': '#3eb489',
    'sky blue': '#87ceeb',
    'skyblue': '#87ceeb',
    'neon magenta': '#ff0090',
    'pearl gold': '#aa7f2e',
    'hot pink': '#ff69b4',
    'neon green': '#39ff14',
    'aurora': ['#c88ddd', '#9ceafe'],
    'neon lime': '#39ff14',
    'deep blue': '#00008b',
    'cosmic latte': '#fff8e7',
    'vivid burgundy': '#9f1d35',
    'aegean blue': '#4e6e81',
    'pearl neo champagne': '#c9ff87',
    'apricot': '#fbceb1',
    'rose quartz': '#f7cac9',
    'serenity': '#b3cee5',
    'pastel rose': '#f6b8d0',
    'pastel rose gold': '#f4c1bc',
    'mint choco': '#b9ffc2',
    'beige': '#f5f5dc',
    'light blue': '#add8e6',
    'navy blue': '#000080',
    'neon yellow': '#cfff04',
    'neon blue': '#1f51ff',
    'pearl white': '#fff4e8',
    'pearl burgundy': '#734648',
    'light periwinkle': '#c1c6fc',
    'pearl red': '#71001c',
    'pearl pink': '#e7accf',
    'pearl lemon yellow': '#f5ddbc',
    'coral pink': '#f88379',
    'creamy beige': '#eedec5',
    'velvet red': '#942222',
    'pearl light pink': '#e7accf',
    'pastel mint': '#add0b3',
    'pearl cosmic mauve': '#e0b0ff',
    'phantom black': '#2f3434',
    'pastel rose pink': '#f8c8dc',
    'pearl aqua green': '#79e5cb',
    'hayoung yellow': '#f3b33e',
    'jiwon magenta': '#bc2c9c',
    'chaeyoung green': '#a0d543',
    'nakyung purple': '#7032ab',
    'jiheon blue': '#54afe8',
    'light purple': '#cbc3e3',
    'neon red': '#e11900',
    'chic violet': '#7e00bf',
    'pearl sapphire blue': '#00239b',
    'aerith pink': '#ffb6c1',
    'nebula violet': '#8f00ff',
    'pastel lavender': '#e9e1fc',
};

const COLOR_TO_RGB: { [key: string]: [number, number, number] } = {
    'pink': [255, 192, 203],
    'black': [0, 0, 0],
    'white': [255, 255, 255],
    'yellow': [255, 255, 0],
    'purple': [128, 0, 128],
    'red': [255, 0, 0],
    'blue': [0, 0, 255],
    'green': [0, 128, 0],
    'orange': [255, 165, 0],
    'gray': [128, 128, 128],
    'grey': [128, 128, 128],
    'brown': [165, 42, 42],
    'cyan': [0, 255, 255],
    'magenta': [255, 0, 255],
    'lime': [0, 255, 0],
    'navy': [0, 0, 128],
    'teal': [0, 128, 128],
    'silver': [192, 192, 192],
    'gold': [255, 215, 0],
    'mint': [62, 180, 137],
};

/**
 * Parse official colors string into array of color names
 */
export const parseOfficialColors = (colorsString?: string): string[] => {
    if (!colorsString) return [];
    return colorsString.split(',').map(color => color.trim()).filter(Boolean);
};

/**
 * Convert color name to hex code (or hex array for multi-color values)
 */
export const getHexColor = (colorName: string): string | string[] => {
    const key = colorName.toLowerCase().trim();
    return COLOR_TO_HEX[key] || colorName; // Return as-is if already hex or unknown
};

/**
 * Determine text color (black or white) based on background color luminance
 */
export const getTextColor = (bgColor: string): string => {
    const colorKey = bgColor.toLowerCase();
    const rgb = COLOR_TO_RGB[colorKey] || [233, 30, 140]; // fallback to EHCO pink RGB

    // Calculate relative luminance
    const [r, g, b] = rgb.map(val => {
        val = val / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Return white for dark backgrounds, black for light backgrounds
    return luminance > 0.21 ? '#000000' : '#FFFFFF';
};

/**
 * Create gradient background style from official colors
 */
export const createGradientStyle = (colorsString?: string): React.CSSProperties => {
    const colors = parseOfficialColors(colorsString);

    // Expand colors array to handle multi-value colors (like aurora)
    const expandedColors: string[] = [];
    colors.forEach(color => {
        const hexColor = getHexColor(color);
        if (Array.isArray(hexColor)) {
            expandedColors.push(...hexColor);
        } else {
            expandedColors.push(hexColor);
        }
    });

    if (expandedColors.length >= 3) {
        return {
            background: `linear-gradient(0deg, ${expandedColors[0]} 0%, ${expandedColors[1]} 50%, ${expandedColors[2]} 100%)`
        };
    } else if (expandedColors.length === 2) {
        return {
            background: `linear-gradient(0deg, ${expandedColors[0]} 50%, ${expandedColors[1]} 100%)`
        };
    } else if (expandedColors.length === 1) {
        return {
            background: `linear-gradient(0deg, ${expandedColors[0]} 50%, #ffffff 100%)`
        };
    } else {
        return {
            background: `linear-gradient(0deg, #d10041 0%, #ffffff 100%)`
        };
    }
};

/**
 * Get primary and secondary colors from official colors string
 */
export const getPrimarySecondaryColors = (colorsString?: string): {
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
} => {
    const colors = parseOfficialColors(colorsString);
    const primaryColor = colors[0] || '#d10041'; // fallback to EHCO pink
    const secondaryColor = colors[1] || 'white';
    const textColor = getTextColor(primaryColor);

    return { primaryColor, secondaryColor, textColor };
};

/**
 * Get initials from a name for profile circles
 */
export const getInitials = (name: string): string => {
    const names = name.split(' ');
    if (names.length >= 2) {
        return names[0][0] + names[1][0];
    }
    return name.substring(0, 2).toUpperCase();
};
