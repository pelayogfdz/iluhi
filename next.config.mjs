/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['pdfmake', 'jszip']
};

export default nextConfig;
