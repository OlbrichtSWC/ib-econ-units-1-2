import { render } from 'preact';
import { App } from './app/App';
import './shared/design/tokens.css';
import './app/app.css';

render(<App />, document.getElementById('app')!);
