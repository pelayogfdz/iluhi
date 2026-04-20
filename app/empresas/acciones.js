'use server'
import prisma from '../../lib/prisma';




import facturapi from '../../lib/facturapi'
import nodemailer from 'nodemailer'

export async function testSmtp(host, port, user, pass) {
    if (!host || !user || !pass) return { success: false, error: 'Faltan credenciales SMTP' };
    try {
      const transporter = nodemailer.createTransport({
        host: host,
        port: port ? parseInt(port) : 587,
        secure: parseInt(port) === 465,
        auth: { user, pass }
      });
      await transporter.verify();
      return { success: true };
    } catch (smtpErr) {
      return { success: false, error: smtpErr.message };
    }
}

export async function actualizarEmpresa(id, data) {
  try {
    // Prueba SMTP Express si viene configuración
    if (data.smtpHost && data.smtpUser && data.smtpPass) {
      const test = await testSmtp(data.smtpHost, data.smtpPort, data.smtpUser, data.smtpPass);
      if(!test.success) {
        return { success: false, error: 'Prueba SMTP Express Fallida. Revisa Host, Puerto o Contraseña: ' + test.error };
      }
    }

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
        correo: data.correo,
        smtpHost: data.smtpHost || null,
        smtpPort: data.smtpPort ? parseInt(data.smtpPort) : null,
        smtpUser: data.smtpUser || null,
        smtpPass: data.smtpPass || null,
        plantillaCotizacion: data.plantillaCotizacion || null,
        plantillaOrdenServicio: data.plantillaOrdenServicio || null,
        plantillaFactura: data.plantillaFactura || null
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
    const { getSessionUser } = require('../../lib/auth');
    const user = await getSessionUser();
    
    if (!user || !user.permisoEliminarEmpresas) {
       throw new Error("No tienes el perfil administrativo necesario para eliminar empresas.");
    }
    
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

export async function subirCSD(empresaId, cerBase64, keyBase64, passwordCsd) {
  try {
    if(!cerBase64 || !keyBase64 || !passwordCsd) throw new Error("Faltan archivos o contraseña")

    const csdDir = path.join(os.tmpdir(), 'escudos_csd')
    if (!fs.existsSync(csdDir)) fs.mkdirSync(csdDir, { recursive: true })

    const cerPathStr = path.join(csdDir, `${empresaId}.cer`)
    const keyPathStr = path.join(csdDir, `${empresaId}.key`)

    const cerBuffer = Buffer.from(cerBase64, 'base64');
    const keyBuffer = Buffer.from(keyBase64, 'base64');

    fs.writeFileSync(cerPathStr, cerBuffer)
    fs.writeFileSync(keyPathStr, keyBuffer)
    
    const empr = await prisma.empresa.findUnique({ where: { id: empresaId } });

    // Sincronizar CSD con Facturapi
    if (empr && empr.facturapiId && process.env.FACTURAPI_USER_KEY) {
        try {
            const FacturapiClient = require('facturapi').default;
            const facturapiAdmin = new FacturapiClient(process.env.FACTURAPI_USER_KEY);
            await facturapiAdmin.organizations.uploadCertificate(empr.facturapiId, cerBuffer, keyBuffer, passwordCsd);
            console.log("CSD Sincronizado exitosamente con Facturapi Tenant: " + empr.facturapiId);
        } catch(fErr) {
            console.error("No se pudo cargar CSD en Facturapi:", fErr.message);
            // No bloqueamos el flujo, pero queda reporte. Podría lanzarse el error según preferencia de negocio.
        }
    }

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
    if (!userKey) throw new Error("Debes configurar la variable FACTURAPI_USER_KEY (Llave Secreta de Usuario/SaaS) en Netlify / .env local para poder subir logotipos via API. Por mientras, puedes subir el logotipo manualmente desde tu Dashboard en facturapi.io");

    // 1. Obtener la organization a la que pertenecemos
    const org = await facturapi.organizations.me();
    
    const FacturapiClient = require('facturapi').default;
    const userFacturapi = new FacturapiClient(userKey);

    // 2. Subir archivo al organization id específico (usando facturapi User Key)
    await userFacturapi.organizations.uploadLogo(org.id, logoFile);

    return { success: true };
  } catch (error) {
    console.error("Error subiendo logo a Facturapi: ", error);
    return { success: false, error: error.message || 'Error al conectar con Facturapi' };
  }
}

// ─── FIEL (e.firma Avanzada) ───────────────────────────────

export async function guardarFiel(empresaId, fielCerBase64, fielKeyBase64, fielPassword) {
  try {
    if (!fielCerBase64 || !fielKeyBase64 || !fielPassword) {
      throw new Error("Debes proporcionar el archivo .CER, el archivo .KEY y la contraseña de la FIEL.")
    }

    // Intentar extraer la fecha de vigencia del certificado (.cer es DER)
    let fielVigencia = null
    try {
      const crypto = require('crypto')
      const cerBuffer = Buffer.from(fielCerBase64, 'base64')
      const cert = new crypto.X509Certificate(cerBuffer)
      fielVigencia = new Date(cert.validTo)
    } catch (e) {
      console.error("Error parseando certificado FIEL empresa:", e)
      // No fatal — la fecha simplemente quedará nula si falla el parsing
    }

    await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        fielCerBase64,
        fielKeyBase64,
        fielPassword,
        fielVigencia
      }
    })

    return { success: true, fielVigencia }
  } catch (error) {
    console.error("Error guardando FIEL: ", error)
    return { success: false, error: error.message }
  }
}

// ─── SOCIOS ────────────────────────────────────────────────

export async function obtenerSocios(empresaId) {
  try {
    const socios = await prisma.socio.findMany({
      where: { empresaId },
      orderBy: { createdAt: 'asc' }
    })
    return { success: true, socios }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function crearSocio(empresaId, nombre, rfc, fielCerBase64, fielKeyBase64, fielPassword) {
  try {
    if (!nombre || !rfc) throw new Error("Nombre y RFC del socio son obligatorios.")

    // Extraer vigencia FIEL del socio si se cargó CER
    let fielVigencia = null
    if (fielCerBase64) {
      try {
        const crypto = require('crypto')
        const cerBuffer = Buffer.from(fielCerBase64, 'base64')
        const cert = new crypto.X509Certificate(cerBuffer)
        fielVigencia = new Date(cert.validTo)
      } catch (e) {
        console.error("Error parseando certificado FIEL socio nuevo:", e)
      }
    }

    const socio = await prisma.socio.create({
      data: {
        empresaId,
        nombre,
        rfc: rfc.toUpperCase(),
        fielCerBase64: fielCerBase64 || null,
        fielKeyBase64: fielKeyBase64 || null,
        fielPassword: fielPassword || null,
        fielVigencia
      }
    })
    return { success: true, socio }
  } catch (error) {
    console.error("Error creando socio: ", error)
    return { success: false, error: error.message }
  }
}

export async function actualizarSocio(socioId, data) {
  try {
    let fielVigencia = undefined
    if (data.fielCerBase64) {
      try {
        const crypto = require('crypto')
        const cerBuffer = Buffer.from(data.fielCerBase64, 'base64')
        const cert = new crypto.X509Certificate(cerBuffer)
        fielVigencia = new Date(cert.validTo)
      } catch (e) {
        console.error("Error parseando certificado FIEL socio actualizado:", e)
      }
    }

    await prisma.socio.update({
      where: { id: socioId },
      data: {
        nombre: data.nombre,
        rfc: data.rfc?.toUpperCase(),
        ...(data.fielCerBase64 && { fielCerBase64: data.fielCerBase64 }),
        ...(data.fielKeyBase64 && { fielKeyBase64: data.fielKeyBase64 }),
        ...(data.fielPassword && { fielPassword: data.fielPassword }),
        ...(fielVigencia !== undefined && { fielVigencia })
      }
    })
    return { success: true }
  } catch (error) {
    console.error("Error actualizando socio: ", error)
    return { success: false, error: error.message }
  }
}

export async function eliminarSocio(socioId) {
  try {
    await prisma.socio.delete({ where: { id: socioId } })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
