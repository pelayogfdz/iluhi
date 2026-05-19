/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['pdfmake', 'jszip', 'pdf-parse']
};

export default nextConfig;
