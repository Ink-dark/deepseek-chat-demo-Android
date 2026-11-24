import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/** 是否运行在 Capacitor 原生容器（Android 应用）中 */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform()

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })

/** 文件名会作为缓存文件路径，去掉路径分隔符等非法字符 */
const toSafeName = (name: string): string => name.replace(/[\\/:*?"<>|]/g, '_') || 'file'

/** 把 Blob 写入缓存目录并调起系统分享面板，可保存到文件管理器或发送给其他应用。 */
export const shareBlob = async (blob: Blob, name: string): Promise<void> => {
  const data = await blobToBase64(blob)
  const { uri } = await Filesystem.writeFile({
    path: toSafeName(name),
    data,
    directory: Directory.Cache,
  })
  await Share.share({ title: name, url: uri })
}

/**
 * WebView 不支持在新标签页打开 blob: 地址（附件原件、导出文件），
 * 点击这类链接时改为写入缓存并调起系统分享。
 */
const interceptBlobLinks = () => {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target
      const anchor = target instanceof Element ? target.closest('a[href^="blob:"]') : null
      if (!(anchor instanceof HTMLAnchorElement)) {
        return
      }
      const name = anchor.download || anchor.title || anchor.querySelector('img')?.alt
      if (!name) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      void fetch(anchor.href)
        .then((response) => response.blob())
        .then((blob) => shareBlob(blob, name))
        .catch(() => {
          // 分享失败时保持页面不跳转即可，用户可重试
        })
    },
    true
  )
}

/**
 * WebView 没有多窗口支持，window.open 会静默失败；
 * 改为当前页面跳转，外部 http(s) 链接由原生层交给系统浏览器打开。
 */
const patchWindowOpen = () => {
  const open = window.open.bind(window)
  window.open = (url?: string | URL, target?: string, features?: string) => {
    const href = typeof url === 'string' ? url : url?.toString()
    if (href && /^https?:\/\//i.test(href)) {
      window.location.assign(href)
      return null
    }
    return open(url, target, features)
  }
}

/** 原生容器内的 WebView 行为适配，Web 环境调用不产生任何改动。 */
export const setupNativeShell = () => {
  if (!isNativeApp()) {
    return
  }
  patchWindowOpen()
  interceptBlobLinks()
}
