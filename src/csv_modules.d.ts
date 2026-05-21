// csv_modules.d.ts - ambient declaration for *.csv imports
//
// esbuild bundles `.csv` files as text via `--loader:.csv=text`.
// This declaration tells TypeScript that an `import x from './foo.csv'`
// yields a string at runtime.

declare module '*.csv' {
	const content: string;
	export default content;
}
