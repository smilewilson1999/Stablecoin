/** @type {import('next').NextConfig} */
const nextConfig = {
	env: {
		NEXT_PUBLIC_NETWORK_URL: process.env.NEXT_PUBLIC_NETWORK_URL,
	},
};

export default nextConfig;
