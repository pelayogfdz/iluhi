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
      include: { 
        creador: { select: { nombre: true } },
        facturas: true
      }
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
    const manualDispersionJson = formData.get('manualDispersion');

    let excelBase64 = null;
    let excelNombre = null;
    let dispersionDetalles = [];

    if (requiereDispersion) {
      if (manualDispersionJson) {
        dispersionDetalles = JSON.parse(manualDispersionJson);
      } else if (fileExcel && fileExcel.size > 0) {
        const excelBuffer = Buffer.from(await fileExcel.arrayBuffer());
        const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
        
        let worksheet;
        let isCustomLayout = false;
        
        if (workbook.SheetNames.includes('COMPLETA')) {
          worksheet = workbook.Sheets['COMPLETA'];
          isCustomLayout = true;
        } else {
          worksheet = workbook.Sheets[workbook.SheetNames[0]];
        }
        
        if (isCustomLayout) {
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          for (let i = 10; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;
            
            const no = row[0];
            if (typeof no !== 'number' && (!no || isNaN(no))) {
              continue;
            }
            
            const nombreCompleto = row[4];
            const clabe = row[6];
            const montoADispersar = parseFloat(row[7]) || 0;
            const banco = row[5] || '';
            const sindicato = parseFloat(row[13]) || 0;
            const efectivo = parseFloat(row[14]) || 0;
            
            if (nombreCompleto && clabe && (montoADispersar > 0 || sindicato > 0 || efectivo > 0)) {
              dispersionDetalles.push({
                nombre: String(nombreCompleto).trim(),
                cuenta: String(clabe).trim(),
                banco: String(banco).trim(),
                monto: montoADispersar || (sindicato + efectivo)
              });
            }
          }
        } else {
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
        }

        excelBase64 = excelBuffer.toString('base64');
        excelNombre = fileExcel.name;
      }
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

    const facturasAsignadasStr = formData.get('facturasAsignadas');
    if (facturasAsignadasStr) {
      const ids = JSON.parse(facturasAsignadasStr);
      if (ids && ids.length > 0) {
        await prisma.factura.updateMany({
          where: { id: { in: ids } },
          data: { operacionId: operacion.id }
        });
      }
    }

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

    // Refresh return object with included facturas
    const operacionConFacturas = await prisma.operacion.findUnique({
      where: { id: operacion.id },
      include: { facturas: true, creador: { select: { nombre: true } } }
    });

    return { success: true, operacion: operacionConFacturas };
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

export async function obtenerFacturasDisponibles() {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'No autorizado' };
  
  try {
    const list = await prisma.factura.findMany({
      where: {
        operacionId: null
      },
      orderBy: { createdAt: 'desc' },
      include: { cliente: { select: { razonSocial: true } } }
    });
    return { success: true, facturas: list };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function analizarExcelDispersion(formData) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'No autorizado' };

  try {
    const fileExcel = formData.get('excelDispersion');
    if (!fileExcel || fileExcel.size === 0) {
      return { success: false, error: 'No se subió ningún archivo' };
    }

    const excelBuffer = Buffer.from(await fileExcel.arrayBuffer());
    const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
    
    let worksheet;
    let isCustomLayout = false;
    
    if (workbook.SheetNames.includes('COMPLETA')) {
      worksheet = workbook.Sheets['COMPLETA'];
      isCustomLayout = true;
    } else {
      worksheet = workbook.Sheets[workbook.SheetNames[0]];
    }

    let metadata = {};
    let dispersionDetalles = [];

    if (isCustomLayout) {
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rawRows[2]) {
        metadata.cliente = rawRows[2][2] || '';
        metadata.empresaReceptora = rawRows[2][8] || '';
      }
      if (rawRows[3]) {
        metadata.razonSocial = rawRows[3][2] || '';
        metadata.banco = rawRows[3][8] || '';
      }
      if (rawRows[4]) {
        metadata.periodoPago = rawRows[4][2] || '';
        metadata.facturaReferencia = rawRows[4][8] || '';
      }
      if (rawRows[5] && rawRows[5][2]) {
        const serial = parseFloat(rawRows[5][2]);
        if (!isNaN(serial)) {
          const utc_days  = Math.floor(serial - 25569);
          const utc_value = utc_days * 86400;                                        
          const date_info = new Date(utc_value * 1000);
          const day = String(date_info.getDate() + 1).padStart(2, '0');
          const month = String(date_info.getMonth() + 1).padStart(2, '0');
          const year = date_info.getFullYear();
          metadata.fechaPago = `${day}-${month}-${year}`;
        } else {
          metadata.fechaPago = String(rawRows[5][2]);
        }
      }

      for (let i = 10; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;
        
        const no = row[0];
        if (typeof no !== 'number' && (!no || isNaN(no))) {
          continue;
        }
        
        const nombreCompleto = row[4];
        const clabe = row[6];
        const montoADispersar = parseFloat(row[7]) || 0;
        const sindicato = parseFloat(row[13]) || 0;
        const efectivo = parseFloat(row[14]) || 0;
        const banco = row[5] || '';
        
        if (nombreCompleto && clabe && (montoADispersar > 0 || sindicato > 0 || efectivo > 0)) {
          dispersionDetalles.push({
            nombre: String(nombreCompleto).trim(),
            cuenta: String(clabe).trim(),
            banco: String(banco).trim(),
            monto: montoADispersar,
            sindicato: sindicato,
            efectivo: efectivo
          });
        }
      }
    } else {
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
    }

    return { success: true, metadata, dispersionDetalles };
  } catch (err) {
    console.error("Error analyzing dispersion excel:", err);
    return { success: false, error: err.message };
  }
}

export async function actualizarExcelOperacion(id, formData) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'No autorizado' };

  try {
    const fileExcel = formData.get('excelDispersion');
    if (!fileExcel || fileExcel.size === 0) {
      return { success: false, error: 'No se subió ningún archivo' };
    }

    const excelBuffer = Buffer.from(await fileExcel.arrayBuffer());
    const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
    
    let worksheet;
    let isCustomLayout = false;
    
    if (workbook.SheetNames.includes('COMPLETA')) {
      worksheet = workbook.Sheets['COMPLETA'];
      isCustomLayout = true;
    } else {
      worksheet = workbook.Sheets[workbook.SheetNames[0]];
    }

    let dispersionDetalles = [];

    if (isCustomLayout) {
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      for (let i = 10; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;
        
        const no = row[0];
        if (typeof no !== 'number' && (!no || isNaN(no))) {
          continue;
        }
        
        const nombreCompleto = row[4];
        const clabe = row[6];
        const montoADispersar = parseFloat(row[7]) || 0;
        const banco = row[5] || '';
        const sindicato = parseFloat(row[13]) || 0;
        const efectivo = parseFloat(row[14]) || 0;
        
        if (nombreCompleto && clabe && (montoADispersar > 0 || sindicato > 0 || efectivo > 0)) {
          dispersionDetalles.push({
            nombre: String(nombreCompleto).trim(),
            cuenta: String(clabe).trim(),
            banco: String(banco).trim(),
            monto: montoADispersar || (sindicato + efectivo)
          });
        }
      }
    } else {
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
    }

    const excelBase64 = excelBuffer.toString('base64');
    const excelNombre = fileExcel.name;

    const updated = await prisma.operacion.update({
      where: { id },
      data: {
        excelBase64,
        excelNombre,
        dispersionDetalles: dispersionDetalles.length > 0 ? dispersionDetalles : null
      },
      include: { facturas: true, creador: { select: { nombre: true } } }
    });

    return { success: true, operacion: updated };
  } catch (err) {
    console.error("Error updating operacion excel:", err);
    return { success: false, error: err.message };
  }
}

export async function exportarExcelDispersion(id) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'No autorizado' };

  try {
    const operacion = await prisma.operacion.findUnique({
      where: { id },
      include: { facturas: true }
    });

    if (!operacion) {
      return { success: false, error: 'Operación no encontrada' };
    }

    const data = [];
    data.push([]);
    data.push([null, 'ARCHIVO DE DISPERSIÓN']);
    data.push([
      null,
      'CLIENTE:',
      'SEPEC',
      null, null, null, null,
      'EMPRESA RECEPTORA:',
      'OIL21 INTEGRITY SERVICES'
    ]);
    data.push([
      null,
      'RAZON SOCIAL:',
      'SEPEC OILFIELD SERVICES SA DE CV',
      null, null, null, null,
      'BANCO:',
      operacion.bancoEmisor || 'KUSPIT'
    ]);
    data.push([
      null,
      'PERIODO DE PAGO:',
      'EXTRAORDINARIO',
      null, null, null, null,
      'FACTURA:',
      operacion.claveRastreo || 'OIL1234'
    ]);
    data.push([
      null,
      'FECHA PAGO:',
      operacion.fechaOperacion || ''
    ]);
    data.push([]);
    data.push([]);

    data.push([
      'NO',
      'APELLIDO PATERNO',
      'APELLIDO MATERNO',
      'NOMBRE (S)',
      'NOMBRE COMPLETO',
      'BANCO',
      'CLABE INTERBANCARIA',
      'MONTO A DISPERSAR',
      'COMISION',
      'SUBTOTAL',
      'IVA',
      'TOTAL A FACTURAR',
      'MONTO DEPOSITADO',
      'SINDICATO',
      'EFECTIVO'
    ]);

    data.push([
      null, null, null, null, null, null, null, null, 0.04, null, 0.16
    ]);

    const detalles = operacion.dispersionDetalles || [];
    detalles.forEach((det, idx) => {
      const base = det.monto || 0;
      const comision = base * 0.04;
      const subtotal = base + comision;
      const iva = subtotal * 0.16;
      const total = subtotal + iva;

      data.push([
        idx + 1,
        '',
        '',
        '',
        det.nombre,
        det.banco || '',
        det.cuenta,
        base,
        comision,
        subtotal,
        iva,
        total,
        total,
        base,
        0
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'COMPLETA');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const base64 = buffer.toString('base64');

    return { success: true, excelBase64: base64, filename: `${operacion.excelNombre || 'dispersion'}_exportada.xlsx` };
  } catch (err) {
    console.error("Error exporting dispersion excel:", err);
    return { success: false, error: err.message };
  }
}
