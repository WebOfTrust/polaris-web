# Signify Polaris Web - React Example

This is a React example demonstrating how to use the `signify-polaris-web` package to interact with the Signify browser extension.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm
- The Signify browser extension installed in your browser

## Setup and Running

### 1. Build the Root Package

Before running this example, you must first build the `signify-polaris-web` package from the repository root:

```bash
# From the repository root (/polaris-web)
cd ../../
npm install
npm run build
```

This compiles the TypeScript source code and generates the `dist` folder that this example depends on.

### 2. Install Dependencies

Navigate to this example directory and install dependencies:

```bash
# From /polaris-web/examples/web-react
npm install
```

### 3. Start the Development Server

Run the Vite development server:

```bash
npm run dev
```

or

```bash
npm start
```

The application will be available at `http://localhost:5173` (or another port if 5173 is in use).

## Troubleshooting

### Error: "Failed to resolve entry for package signify-polaris-web"

This means the root package hasn't been built yet. Make sure to run `npm run build` in the repository root directory first.

### Permission Errors with Vite Cache

If you encounter permission errors related to `node_modules/.vite/`, try:

```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Project Structure

- `src/App.tsx` - Main application component with Signify extension integration
- `src/main.tsx` - Application entry point
- `index.html` - HTML template
- `vite.config.ts` - Vite configuration

## Features Demonstrated

This example shows how to:
- Detect if the Signify browser extension is installed
- Authorize with the extension
- Create and sign credentials
- Generate signed headers for HTTP requests
- Handle extension client interactions

## Learn More

- [Signify Polaris Web Documentation](../../README.md)
- [Getting Started Guide](../../GETTING_STARTED.md)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
