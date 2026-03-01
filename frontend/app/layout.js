import './globals.css'
import { AuthProvider } from '../context/AuthContext'
import { ToastProvider } from '../components/ToastProvider'

export const metadata = {
  title: 'PowerNest - Renewable Energy Marketplace',
  description:
    'Connect renewable energy producers, consumers, and investors in a sustainable energy marketplace.',
  keywords:
    'renewable energy, solar, wind, marketplace, sustainability, green energy',
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var saved = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = saved ? saved === 'dark' : prefersDark;
                  document.documentElement.classList.toggle('dark', isDark);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans">
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
