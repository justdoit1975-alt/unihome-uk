import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UniHome UK - 英国留学生一站式租房平台',
  description: '优选英家 · AI赋能 · 英国留学生一站式租房平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
