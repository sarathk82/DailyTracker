import { AppRegistry } from 'react-native';
import App from './App';

const rootTag = document.getElementById('root') || document.getElementById('main');
AppRegistry.registerComponent('main', () => App);
AppRegistry.runApplication('main', { rootTag });
