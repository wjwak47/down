/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'primary': '#137fec',
                'background-light': '#f6f7f8',
                'background-dark': '#101922',
                'sidebar-light': '#F5F9FF',
                'slate-blue': '#475569',
                'whisper-blue': '#eef2ff',
                'input-tint': '#f0f7ff',
            },
            fontFamily: {
                'display': ['Inter', 'sans-serif'],
                'chinese': ['"PingFang SC"', '"Microsoft YaHei"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
            },
            borderRadius: {
                'DEFAULT': '0.25rem',
                'lg': '0.5rem',
                'xl': '0.75rem',
                '2xl': '1rem',
                '3xl': '1.5rem',
                'full': '9999px'
            },
            fontSize: {
                // 响应式字体大小
                'xs': ['0.75rem', { lineHeight: '1rem' }],
                'sm': ['0.875rem', { lineHeight: '1.25rem' }],
                'base': ['1rem', { lineHeight: '1.5rem' }],
                'lg': ['1.125rem', { lineHeight: '1.75rem' }],
                'xl': ['1.25rem', { lineHeight: '1.75rem' }],
                '2xl': ['1.5rem', { lineHeight: '2rem' }],
                '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
                '100': '25rem',
                '120': '30rem',
            },
            screens: {
                'xs': '480px',
                'sm': '640px',
                'md': '768px',
                'lg': '1024px',
                'xl': '1280px',
                '2xl': '1536px',
                '3xl': '1920px',
            },
            minHeight: {
                'screen-content': 'calc(100vh - 120px)',
            },
            maxHeight: {
                'screen-content': 'calc(100vh - 120px)',
            },
        },
    },
    plugins: [],
}
