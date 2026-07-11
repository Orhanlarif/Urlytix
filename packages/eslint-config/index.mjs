export const baseRules = {
  '@typescript-eslint/no-explicit-any': 'error',
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  'prefer-const': 'error',
};

export default [{ rules: baseRules }];
