import { Platform, Dimensions } from 'react-native';

/**
 * Detect if the app is running on a desktop/laptop device
 */
export const isDesktop = (): boolean => {
  if (Platform.OS === 'web') {
    // Check window width and user agent
    const width = Dimensions.get('window').width;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    
    // Desktop if width is large and not a mobile user agent
    const isLargeScreen = width > 768;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    return isLargeScreen && !isMobileUA;
  }
  
  // Native iOS and Android are not desktop
  return false;
};

/**
 * Detect if the device has touch capability
 */
export const isTouchDevice = (): boolean => {
  if (Platform.OS === 'web') {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  }
  
  // Native platforms are always touch devices
  return true;
};
