import { Platform } from 'react-native';

export const showNotification = (message: string) => {
  // Default to using alert for all platforms in the main file
  // Platform-specific implementations will override this in .web.ts and .native.ts
  alert(message);
};
