import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/generated/**",
      "supabase/functions/**",
      "scratch/**",
      "sentry*.config.ts",
    ],
  },
];

export default eslintConfig;
