import { Platform, Dimensions } from 'react-native';
import { isDesktop, isTouchDevice } from '../platform';

describe('Platform Utilities', () => {
  describe('isDesktop', () => {
    const originalPlatform = Platform.OS;
    const originalNavigator = global.navigator;

    afterEach(() => {
      Platform.OS = originalPlatform;
      global.navigator = originalNavigator;
    });

    it('should return false for iOS platform', () => {
      Platform.OS = 'ios';
      expect(isDesktop()).toBe(false);
    });

    it('should return false for Android platform', () => {
      Platform.OS = 'android';
      expect(isDesktop()).toBe(false);
    });

    it('should return true for web with large screen and desktop UA', () => {
      Platform.OS = 'web';
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 1920, height: 1080, scale: 1, fontScale: 1 });
      
      // Mock desktop user agent
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        writable: true
      });

      expect(isDesktop()).toBe(true);
    });

    it('should return false for web with mobile UA', () => {
      Platform.OS = 'web';
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 1920, height: 1080, scale: 1, fontScale: 1 });
      
      // Mock mobile user agent
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' },
        writable: true
      });

      expect(isDesktop()).toBe(false);
    });

    it('should return false for web with small screen', () => {
      Platform.OS = 'web';
      jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 375, height: 667, scale: 1, fontScale: 1 });
      
      Object.defineProperty(global, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        writable: true
      });

      expect(isDesktop()).toBe(false);
    });
  });

  describe('isTouchDevice', () => {
    const originalPlatform = Platform.OS;
    const originalWindow = global.window;
    const originalNavigator = global.navigator;

    afterEach(() => {
      Platform.OS = originalPlatform;
      global.window = originalWindow;
      global.navigator = originalNavigator;
    });

    it('should return true for iOS', () => {
      Platform.OS = 'ios';
      expect(isTouchDevice()).toBe(true);
    });

    it('should return true for Android', () => {
      Platform.OS = 'android';
      expect(isTouchDevice()).toBe(true);
    });

    it('should return true for web with touch support', () => {
      Platform.OS = 'web';
      
      Object.defineProperty(global, 'window', {
        value: { ontouchstart: () => {} },
        writable: true
      });

      Object.defineProperty(global, 'navigator', {
        value: { maxTouchPoints: 1 },
        writable: true
      });

      expect(isTouchDevice()).toBe(true);
    });

    it('should return false for web without touch support', () => {
      Platform.OS = 'web';
      
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true
      });

      Object.defineProperty(global, 'navigator', {
        value: { maxTouchPoints: 0 },
        writable: true
      });

      expect(isTouchDevice()).toBe(false);
    });
  });
});
