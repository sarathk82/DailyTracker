import { Platform } from 'react-native';

// Define the showToast function for each platform
const showToastWeb = (message: string) => {
  alert(message);
};

const showToastAndroid = (message: string) => {
  // We'll only try to use ToastAndroid when we're actually on Android
  const { ToastAndroid } = require('react-native');
  ToastAndroid.show(message, ToastAndroid.SHORT);
};

const showToastIOS = (message: string) => {
  // We'll use Alert for iOS
  const { Alert } = require('react-native');
  Alert.alert('', message, [{ text: 'OK' }]);
};

// Export a platform-specific function
export const showNotification = (() => {
  switch (Platform.OS) {
    case 'web':
      return showToastWeb;
    case 'android':
      return showToastAndroid;
    case 'ios':
      return showToastIOS;
    default:
      return showToastWeb;
  }
})();
