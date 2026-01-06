/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#1890ff',
                    hover: '#40a9ff',
                },
                bg: {
                    app: '#f5f7fa',
                    card: '#ffffff',
                },
                text: {
                    primary: '#1f2937',
                    secondary: '#6b7280',
                }
            }
        },
    },
    plugins: [],
}
