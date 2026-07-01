'use server'

import prisma from '../../lib/prisma';
import { getSessionUser } from '../../lib/auth';
import { Transferencia, getBankName } from 'cep-banxico';
import * as XLSX from 'xlsx';

export async function obtenerOperaciones() {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'No autorizado' };
  
  try {
    const list = await prisma.operacion.findMany({
      orderBy: { createdAt: 'desc' },
      include: { creador: { select: { nombre: true } } }
    });
    return { success: true, operaciones: list };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function realizarValidacionCEP(operacionId, datos) {
  const { fechaOperacion, claveRastreo, bancoEmisor, bancoReceptor, cuentaBeneficiario, monto } = datos;
  
  let formattedDate = fechaOperacion;
  if (fechaOperacion.includes('/')) {
    formattedDate = fechaOperacion.replace(/\//g, '-');
  }
  
  const montoCentavos = Math.round(monto * 100);

  try {
    const transferencia = await Transferencia.validar(
      formattedDate,
      claveRastreo,
      bancoEmisor,
      bancoReceptor,
      cuentaBeneficiario,
      montoCentavos,
      false
    );

    const pdfBuffer = await transferencia.descargarPDF();
    const xmlBuffer = await transferencia.descargar('XML');

    const oper = await prisma.operacion.update({
      where: { id: operacionId },
      data: {
        estatus: 'Confirmado CEP',
        cepPdfBase64: pdfBuffer.toString('base64'),
        cepXmlBase64: xmlBuffer.toString('base64'),
        ultimoIntentoCEP: new Date()
      }
    });

    try {
      const client = await prisma.cliente.findFirst({
        where: {
          OR: [
            { rfc: transferencia.beneficiario.rfc },
            { razonSocial: { contains: transferencia.beneficiario.nombre, mode: 'insensitive' } }
          ]
        }
      });

      await prisma.pagoFlujo.create({
        data: {
          banco: getBankName(bancoEmisor) || bancoEmisor,
          monto: monto,
          fechaPago: new Date(transferencia.fechaOperacion),
          estatus: 'Confirmado CEP',
          clienteId: client?.id || null
        }
      });
    } catch (e) {
      console.error("Error creating PagoFlujo from CEP:", e.message);
    }

    return oper;
  } catch (err) {
    console.error("Banxico CEP validation failed:", err.message);
    
    let estatus = 'Error CEP';
    if (err.name === 'TransferNotFoundError') {
      estatus = 'CEP No Encontrado';
    } else if (err.name === 'MaxRequestError') {
      estatus = 'Límite Consultas CEP';
    }

    return await prisma.operacion.update({
      where: { id: operacionId },
      data: { 
        estatus,
        ultimoIntentoCEP: new Date()
      }
    });
  }
}

export async function crearOperacion(formData) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'No autorizado' };

  try {
    const tipoMovimiento = formData.get('tipoMovimiento');
    const requiereDispersion = formData.get('requiereDispersion') === 'true';
    
    const fechaOperacion = formData.get('fechaOperacion') || null;
    const claveRastreo = formData.get('claveRastreo') || null;
    const bancoEmisor = formData.get('bancoEmisor') || null;
    const bancoReceptor = formData.get('bancoReceptor') || null;
    const cuentaBeneficiario = formData.get('cuentaBeneficiario') || null;
    const montoStr = formData.get('monto') || '0';
    const monto = parseFloat(montoStr.replace(/[^0-9.]/g, '')) || 0;

    const fileExcel = formData.get('excelDispersion');

    let excelBase64 = null;
    let excelNombre = null;
    let dispersionDetalles = [];

    if (requiereDispersion && fileExcel && fileExcel.size > 0) {
      const excelBuffer = Buffer.from(await fileExcel.arrayBuffer());
      const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      dispersionDetalles = rows.map(r => {
        const nombreKey = Object.keys(r).find(k => /nombre|name|beneficiario/i.test(k)) || 'nombre';
        const cuentaKey = Object.keys(r).find(k => /cuenta|clabe|target|card/i.test(k)) || 'cuenta';
        const montoKey = Object.keys(r).find(k => /monto|amount|importe/i.test(k)) || 'monto';
        
        return {
          nombre: String(r[nombreKey] || '').trim(),
          cuenta: String(r[cuentaKey] || '').trim(),
          monto: parseFloat(String(r[montoKey] || '0').replace(/[^0-9.]/g, '')) || 0
        };
      }).filter(r => r.nombre && r.cuenta && r.monto > 0);

      excelBase64 = excelBuffer.toString('base64');
      excelNombre = fileExcel.name;
    }

    let operacion = await prisma.operacion.create({
      data: {
        tipoMovimiento,
        fechaOperacion,
        claveRastreo,
        bancoEmisor,
        bancoReceptor,
        cuentaBeneficiario,
        monto,
        requiereDispersion,
        excelBase64,
        excelNombre,
        dispersionDetalles: dispersionDetalles.length > 0 ? dispersionDetalles : null,
        creadorId: user.id,
        estatus: 'Pendiente'
      }
    });

    if (fechaOperacion && claveRastreo && bancoEmisor && bancoReceptor && cuentaBeneficiario && monto > 0) {
      operacion = await realizarValidacionCEP(operacion.id, {
        fechaOperacion,
        claveRastreo,
        bancoEmisor,
        bancoReceptor,
        cuentaBeneficiario,
        monto
      });
    }

    return { success: true, operacion };
  } catch (err) {
    console.error("Error creating operacion:", err);
    return { success: false, error: err.message };
  }
}

export async function validarCepManual(id, datosCep) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'No autorizado' };

  try {
    const updatedOper = await prisma.operacion.update({
      where: { id },
      data: {
        fechaOperacion: datosCep.fechaOperacion,
        claveRastreo: datosCep.claveRastreo,
        bancoEmisor: datosCep.bancoEmisor,
        bancoReceptor: datosCep.bancoReceptor,
        cuentaBeneficiario: datosCep.cuentaBeneficiario,
        monto: parseFloat(datosCep.monto)
      }
    });

    const oper = await realizarValidacionCEP(id, datosCep);
    return { success: true, operacion: oper };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
