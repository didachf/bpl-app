import { render } from 'preact'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './styles.css'
import { App } from './app'

const root = document.getElementById('app')
if (!root) throw new Error('Falta el nodo #app en index.html')
render(<App />, root)
