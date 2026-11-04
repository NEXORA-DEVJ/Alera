import { registerRootComponent } from 'expo';
// Registrar definicion de tarea de segundo plano antes del montaje de componentes
import './src/services/backgroundTask';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
