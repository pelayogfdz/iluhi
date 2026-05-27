/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ['@prisma/client', 'pdfmake', 'jszip', 'pdf-parse', 'pdf2json']
};

export default nextConfig;
