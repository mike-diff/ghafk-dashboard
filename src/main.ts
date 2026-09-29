import './style.css'
import { title } from './title'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `<h1>${title}</h1>`
