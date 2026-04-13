'use server'
import prisma from '../../lib/prisma';




import facturapi from '../../lib/facturapi'



export async function actualizarEmpresa(id, data) {
  try {
    await prisma.empresa.update({
      where: { id },
      data: {
        rfc: data.rfc,
        razonSocial: data.razonSocial,
        regimen: data.regimen,
        codigoPostal: data.codigoPostal,
        calle: data.calle,
        numExterior: data.numExterior,
        numInterior: data.numInterior,
        colonia: data.colonia,
        municipio: data.municipio,
        ciudad: data.ciudad,
        estado: data.estado,
        correo: data.correo
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar empresa: ", error);
    return { success: false, error: error.message };
  }
}

export async function eliminarEmpresa(id) {
  try {
    await prisma.empresa.delete({
      where: { id }
    });
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar empresa: ", error);
    return { success: false, error: error.message };
  }
}

const fs = require('fs')
const path = require('path')
const os = require('os')

export async function subirCSD(empresaId, formData) {
  try {
    const cerFile = formData.get('cerFile')
    const keyFile = formData.get('keyFile')
    const passwordCsd = formData.get('passwordCsd')
    
    if(!cerFile || !keyFile || !passwordCsd) throw new Error("Faltan archivos o contraseña")

    const csdDir = path.join(os.tmpdir(), 'escudos_csd')
    if (!fs.existsSync(csdDir)) fs.mkdirSync(csdDir, { recursive: true })

    const cerPathStr = path.join(csdDir, `${empresaId}.cer`)
    const keyPathStr = path.join(csdDir, `${empresaId}.key`)

    const cerBuffer = Buffer.from(await cerFile.arrayBuffer());
    const keyBuffer = Buffer.from(await keyFile.arrayBuffer());

    fs.writeFileSync(cerPathStr, cerBuffer)
    fs.writeFileSync(keyPathStr, keyBuffer)

    await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        cerPath: cerPathStr,
        keyPath: keyPathStr,
        passwordCsd: passwordCsd
      }
    })

    return { success: true }
  } catch(error) {
    console.error("Error CSD: ", error)
    return { success: false, error: error.message }
  }
}

export async function subirLogo(formData) {
  try {
    const logoFile = formData.get('logoFile');
    const userKey = process.env.FACTURAPI_USER_KEY;
    
    if (!logoFile) throw new Error("Falta el archivo de logo");
    if (!userKey) throw new Error("El sistema no tiene configurada la variable oculta FACTURAPI_USER_KEY en Netlify.");

    // 1. Obtener la organization a la que pertenecemos (usando la llave de Organización estándar)
    const org = await facturapi.organizations.me();
    
    // 2. Facturapi requiere privilegios de cuenta maestra para modificar Profile.
    // Instanciamos el cliente Facturapi oculto usando la UK (User Key)
    const FacturapiClient = require('facturapi').default;
    const userFacturapi = new FacturapiClient(userKey);

    // 3. Subir archivo al organization id específico
    await userFacturapi.organizations.uploadLogo(org.id, logoFile);

    return { success: true };
  } catch (error) {
    console.error("Error subiendo logo a Facturapi: ", error);
    return { success: false, error: error.message || 'Error al conectar con Facturapi' };
  }
}
