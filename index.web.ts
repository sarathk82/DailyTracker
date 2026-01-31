import { AppRegistry } from 'react-native';
import App from './App';
import * as serviceWorkerRegistration from './src/serviceWorkerRegistration';

const rootTag = document.getElementById('root') || document.getElementById('main');
AppRegistry.registerComponent('main', () => App);
AppRegistry.runApplication('main', { rootTag });

// Register service worker for PWA support
serviceWorkerRegistration.register();
