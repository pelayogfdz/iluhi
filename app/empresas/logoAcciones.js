'use server'

import prisma from '../../lib/prisma';
import FacturapiClient from 'facturapi';
import https from 'https';

const facturapi = new (FacturapiClient.default || FacturapiClient)(process.env.FACTURAPI_USER_KEY);

function fetchImageBase64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || 'image/jpeg';
        resolve(`data:${contentType};base64,${buffer.toString('base64')}`);
      });
      res.on('error', (err) => resolve(null));
    }).on('error', (err) => resolve(null));
  });
}

export async function syncAndCheckLogos() {
  try {
    const empresas = await prisma.empresa.findMany({
      select: {
        id: true,
        razonSocial: true,
        facturapiId: true,
        logoBase64: true
      }
    });

    const missingLogos = [];

    for (const empresa of empresas) {
      if (!empresa.logoBase64) {
        let synced = false;
        
        if (empresa.facturapiId) {
          try {
            const org = await facturapi.organizations.retrieve(empresa.facturapiId);
            if (org.logo_url) {
              const base64 = await fetchImageBase64(org.logo_url);
              if (base64) {
                await prisma.empresa.update({
                  where: { id: empresa.id },
                  data: { logoBase64: base64 }
                });
                synced = true;
              }
            }
          } catch (error) {
            console.error(`Error sync logo para ${empresa.razonSocial}:`, error);
          }
        }

        if (!synced) {
          missingLogos.push(empresa.razonSocial);
        }
      }
    }

    return {
      success: true,
      missingLogos
    };
  } catch (error) {
    console.error("Error global en syncAndCheckLogos:", error);
    return {
      success: false,
      missingLogos: []
    };
  }
}
