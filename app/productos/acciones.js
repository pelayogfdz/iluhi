'use server'
import prisma from '../../lib/prisma';


import { redirect } from 'next/navigation'



export async function importarProductosMasivos(productosArray, empresaId) {
  if (!empresaId) throw new Error("Debes seleccionar una empresa emisora primero");

  let conteo = 0;
  for (const prod of productosArray) {
    try {
      // Intenta registrar en BD la clave SAT suministrada para poblar el buscador futuro
      if (prod.claveProdServ) {
        await prisma.satCatalogoProducto.upsert({
          where: { clave: prod.claveProdServ.toString() },
          update: {},
          create: {
            clave: prod.claveProdServ.toString(),
            descripcion: prod.descripcion || 'Importado MASIVO'
          }
        }).catch(e => console.log('Sat clave ya existe / error menor', e));
      }

      await prisma.producto.create({
        data: {
          empresaId: empresaId,
          noIdentificacion: prod.noIdentificacion ? prod.noIdentificacion.toString() : `MASIVO-${Date.now()}-${conteo}`,
          descripcion: prod.descripcion ? prod.descripcion.toString() : 'Sin descripcion',
          claveProdServ: prod.claveProdServ ? prod.claveProdServ.toString() : '01010101',
          claveUnidad: prod.claveUnidad ? prod.claveUnidad.toString() : 'H87',
          precio: parseFloat(prod.precio) || 0,
          impuesto: prod.impuesto ? prod.impuesto.toString() : '002',
          objetoImp: prod.objetoImp ? prod.objetoImp.toString() : '02',
          tipoFactor: prod.tipoFactor ? prod.tipoFactor.toString() : 'Tasa',
          tasaOCuota: parseFloat(prod.tasaOCuota) !== NaN ? parseFloat(prod.tasaOCuota) : 0.160000
        }
      });
      conteo++;
    } catch (e) {
      console.error("Error importando fila", e);
    }
  }

  return { success: true, guardados: conteo };
}
