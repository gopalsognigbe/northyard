import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { studioExportPlugin } from './scripts/studio-export-plugin.mjs'

export default defineConfig({
  plugins: [react(), studioExportPlugin()],
})
