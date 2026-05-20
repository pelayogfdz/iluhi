/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['pdfmake', 'jszip', 'pdf-parse', 'pdf2json']
};

export default nextConfig;
