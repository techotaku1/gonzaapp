import "./src/env.js";

// @ts-check

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
	reactStrictMode: true,
	images: {
		dangerouslyAllowSVG: true,
		contentDispositionType: 'attachment',
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
		deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		minimumCacheTTL: 60,
		remotePatterns: [
			new URL('https://img.clerk.com/**'),
		],
	},
	turbopack: {
		resolveAlias: {
			underscore: 'lodash',
			mocha: { browser: 'mocha/browser-entry.js' },
		},
		resolveExtensions: [
			'.mdx',
			'.tsx',
			'.ts',
			'.jsx',
			'.js',
			'.mjs',
			'.json',
			'.mp4',
		],
		rules: {
			'*.svg': {
				loaders: ['@svgr/webpack'],
				as: '*.js',
			}
		},
	},
	expireTime: 3600,
};
export default nextConfig;
