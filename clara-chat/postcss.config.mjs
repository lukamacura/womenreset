// postcss.config.mjs
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},   // ✅ ispravno: ime paketa -> opcije
  },
};

export default config;
