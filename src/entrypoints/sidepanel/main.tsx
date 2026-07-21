import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { SidePanelApp } from '../../ui/SidePanelApp'

/** تركيب وتشغيل فقط — بلا منطق منتج. */
const container = document.getElementById('root')

if (container === null) {
  throw new Error('عنصر الجذر غير موجود في صفحة اللوحة الجانبية.')
}

createRoot(container).render(
  <StrictMode>
    <SidePanelApp />
  </StrictMode>,
)
