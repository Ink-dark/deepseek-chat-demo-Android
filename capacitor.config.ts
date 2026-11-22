import type { CapacitorConfig } from '@capacitor/cli'

/** Capacitor 配置：把 dist/ 静态产物打包进 Android 应用，页面通过 https://localhost 加载 */
const config: CapacitorConfig = {
  appId: 'com.deepseek.chatdemo',
  appName: 'Chat Demo',
  webDir: 'dist',
}

export default config
