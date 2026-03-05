/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                sapBlue: '#0A6ED1',    // Corporate Blue
                riskRed: '#D93025',    // Danger Red
                riskAmber: '#F9AB00',  // Warning Yellow
                safeGreen: '#188038',  // Success Green
            }
        },
    },
    plugins: [],
}