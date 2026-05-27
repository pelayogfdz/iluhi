/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['@prisma/client', 'pdfmake', 'jszip', 'pdf-parse', 'pdf2json']
};

export default nextConfig;
