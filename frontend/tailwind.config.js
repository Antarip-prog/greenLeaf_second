/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'], darkMode: 'class', theme: {
        extend: {
            colors: {
                leaf: {
                    50: '#f3f8f1', 100: '#e2efdf', 500: '#4c8656', 700: '#28563a', 900: '#173522'
                }, sand: '#f6f1e8'
            }, fontFamily: {
                display: ['Georgia', 'serif']
            }
        }
    }, plugins: []
};
