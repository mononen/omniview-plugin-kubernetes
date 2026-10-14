import tinycolor from 'tinycolor2';

/**
 * Generate a dterministic random color based on an input string
 */
export function stringToColor(string: string, alpha = 0.5) {
  let hash = 0;
  let i;

  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }

  return tinycolor(color).setAlpha(alpha).toString();
}

