'use server'

import { PrismaClient } from '@prisma/client'
import facturapi from '../../lib/facturapi'

const prisma = new PrismaClient()

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
    if (!logoFile) throw new Error("Falta el archivo de logo");

    // Facturapi requiere que conozcamos nuestra propia organization id (Tenant global)
    const org = await facturapi.organizations.me();
    
    // Subir archivo real
    await facturapi.organizations.uploadLogo(org.id, logoFile);

    return { success: true };
  } catch (error) {
    console.error("Error subiendo logo a Facturapi: ", error);
    return { success: false, error: error.message || 'Error al conectar con Facturapi' };
  }
}
