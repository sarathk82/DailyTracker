import { Platform, Dimensions } from 'react-native';

export const isDesktop = (): boolean => {
  if (Platform.OS === 'web') {
    // Check if it's a desktop browser
    const { width } = Dimensions.get('window');
    // Consider desktop if width is greater than 768px (tablet breakpoint)
    // and user agent doesn't indicate mobile/tablet
    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      return width > 768 && !isMobileUA;
    }
    return width > 1024; // Fallback to width-based detection
  }
  return false; // Native iOS/Android are never desktop
};

export const isTouchDevice = (): boolean => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
  return Platform.OS !== 'web'; // Native platforms are always touch
};
