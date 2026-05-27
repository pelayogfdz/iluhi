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
        rfc: true,
        facturapiId: true,
        logoBase64: true,
        facturapiLiveKey: true,
        facturapiTestKey: true
      }
    });

    const missingLogos = [];
    let facturapiOrgs = null;

    for (const empresa of empresas) {
      let currentFacturapiId = empresa.facturapiId;
      let currentLogo = empresa.logoBase64;

      // 1. Auto-heal missing facturapiId by querying Facturapi and matching by RFC (tax_id)
      if (!currentFacturapiId) {
        if (!facturapiOrgs) {
          try {
            const orgsList = await facturapi.organizations.list({ limit: 100 });
            facturapiOrgs = orgsList.data || [];
          } catch (e) {
            console.error("Error al obtener organizaciones de Facturapi para auto-healing:", e);
            facturapiOrgs = [];
          }
        }

        const matchingOrg = facturapiOrgs.find(o => o.legal && o.legal.tax_id === empresa.rfc);
        if (matchingOrg) {
          console.log(`Auto-healing: Vinculando organización de Facturapi para ${empresa.razonSocial} -> ${matchingOrg.id}`);
          currentFacturapiId = matchingOrg.id;

          let liveKey = empresa.facturapiLiveKey;
          let testKey = empresa.facturapiTestKey;
          try {
            liveKey = await facturapi.organizations.renewLiveApiKey(matchingOrg.id);
            testKey = await facturapi.organizations.renewTestApiKey(matchingOrg.id);
          } catch (e) {
            console.error(`Error renovando API keys para ${empresa.razonSocial} durante auto-healing:`, e);
          }

          let logoBase64 = null;
          if (matchingOrg.logo_url) {
            logoBase64 = await fetchImageBase64(matchingOrg.logo_url);
          }

          await prisma.empresa.update({
            where: { id: empresa.id },
            data: {
              facturapiId: matchingOrg.id,
              logoBase64: logoBase64 || undefined,
              facturapiLiveKey: liveKey || undefined,
              facturapiTestKey: testKey || undefined
            }
          });

          currentLogo = logoBase64 || currentLogo;
        }
      }

      // 2. Sync logo if facturapiId exists but logo is missing locally
      if (!currentLogo) {
        let synced = false;

        if (currentFacturapiId) {
          try {
            const org = await facturapi.organizations.retrieve(currentFacturapiId);
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
