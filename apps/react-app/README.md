# React + TypeScript + NX Monorepo

This project is now part of an NX monorepo that includes both a React application and a NestJS application.

## React Application

The React application is located in the `apps/react-app` directory. It is built using TypeScript and various dependencies.

### Running the React Application

To run the React application, use the following command:

```bash
nx serve react-app
```

### Building the React Application

To build the React application, use the following command:

```bash
nx build react-app
```

### Linting the React Application

To lint the React application, use the following command:

```bash
nx lint react-app
```

## NestJS Application

The NestJS application is located in the `apps/nest-app` directory. It is configured with the default settings.

### Running the NestJS Application

To run the NestJS application, use the following command:

```bash
nx serve nest-app
```

### Building the NestJS Application

To build the NestJS application, use the following command:

```bash
nx build nest-app
```

### Linting the NestJS Application

To lint the NestJS application, use the following command:

```bash
nx lint nest-app
```

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
