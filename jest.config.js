// jest.config.js
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Next.js uygulamasının dizin yolu (.env dosyalarını yüklemek için)
  dir: "./",
});

const customJestConfig = {
  // Backend/API ve veri tabanı algoritmalarını test ettiğimiz için Node.js ortamını kullanıyoruz
  testEnvironment: "node",
  moduleNameMapper: {
    // tsconfig.json içindeki path alias eşleşmesi
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/tests/**/*.test.ts"],
};

module.exports = createJestConfig(customJestConfig);
