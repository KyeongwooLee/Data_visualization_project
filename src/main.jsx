import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const isNaverMapSdkError = (message = '', source = '') => (
	`${message} ${source}`.includes('oapi.map.naver.com/openapi/v3/maps.js') ||
	`${message} ${source}`.includes("Cannot read properties of null (reading 'capitalize')")
)

const previousOnError = window.onerror
window.onerror = (message, source, lineno, colno, error) => {
	if (isNaverMapSdkError(String(message), String(source))) return true
	if (typeof previousOnError === 'function') return previousOnError(message, source, lineno, colno, error)
	return false
}

window.addEventListener('error', (event) => {
	if (isNaverMapSdkError(event.message, event.filename)) event.preventDefault()
}, true)

createRoot(document.getElementById('root')).render(
	<App />
)
