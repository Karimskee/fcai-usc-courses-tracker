/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    images: {
        unoptimized: true
    },
    basePath: process.env.NODE_ENV === 'production' ? '/fcai-usc-courses-tracker' : '',
};

export default nextConfig;
