import prisma from '../../lib/prisma';
import Link from 'next/link'
import SearchBar from '../components/SearchBar'
import FacturasClient from './FacturasClient'

export const dynamic = 'force-dynamic'



import { getSessionUser } from '../../lib/auth';

export default async function FacturaHubPage({ searchParams }) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ""
  const folioQuery = resolvedParams?.folio || ""
  const empresaId = resolvedParams?.empresa || ""
  const clienteId = resolvedParams?.cliente || ""
  const metodoPago = resolvedParams?.metodoPago || ""
  const fechaInicio = resolvedParams?.fechaInicio || ""
  const fechaFin = resolvedParams?.fechaFin || ""
  const orden = resolvedParams?.orden || "desc"
  const page = parseInt(resolvedParams?.page || "1", 10)
  const limit = 50
  const skip = (page - 1) * limit

  const user = await getSessionUser();

  // Construir clausulas WHERE
  const andClauses = []
  
  if (q) {
    const qNum = parseInt(q, 10);
    const folioFilter = !isNaN(qNum) ? { folio: qNum } : null;
    andClauses.push({
      OR: [
        { uuid: { contains: q, mode: 'insensitive' } },
        { estatus: { contains: q, mode: 'insensitive' } },
        { serie: { contains: q, mode: 'insensitive' } },
        { empresa: { razonSocial: { contains: q, mode: 'insensitive' } } },
        { cliente: { razonSocial: { contains: q, mode: 'insensitive' } } },
        ...(folioFilter ? [folioFilter] : [])
      ]
    })
  }

  if (folioQuery) {
    const match = folioQuery.match(/^([A-Za-z]+)?\s*(\d+)?$/);
    if (match) {
      const parsedSerie = match[1];
      const parsedFolioStr = match[2];
      const folioClause = [];
      if (parsedSerie) {
        folioClause.push({ serie: { contains: parsedSerie, mode: 'insensitive' } });
      }
      if (parsedFolioStr) {
        folioClause.push({ folio: parseInt(parsedFolioStr, 10) });
      }
      if (folioClause.length > 0) {
        andClauses.push({ AND: folioClause });
      }
    }
  }

  if (empresaId) {
    // Si solicita ver una empresa que no está en sus permitidas (y tiene límite), forzamos vacío
    if (user?.empresasIds?.length > 0 && !user.empresasIds.includes(empresaId)) {
      andClauses.push({ empresaId: 'restricted_forbidden' });
    } else {
      andClauses.push({ empresaId: empresaId })
    }
  } else if (user?.empresasIds?.length > 0) {
    // Si no filtra pero tiene limite, limitamos
    andClauses.push({ empresaId: { in: user.empresasIds } });
  }

  if (clienteId) {
    andClauses.push({ clienteId: clienteId });
  }

  if (metodoPago) {
    andClauses.push({ metodoPago: metodoPago });
  }

  if (fechaInicio || fechaFin) {
    const dates = {}
    if (fechaInicio) dates.gte = new Date(`${fechaInicio}T00:00:00.000Z`)
    if (fechaFin) dates.lte = new Date(`${fechaFin}T23:59:59.999Z`)
    andClauses.push({ fechaEmision: dates })
  }

  const whereClause = andClauses.length > 0 ? { AND: andClauses } : {}

  const rpClientes = (user?.permisoAsignacionClientes) ? {} : { usuariosAsignados: { some: { id: user?.id } } };

  const [facturas, totalCount, empresas, clientes] = await Promise.all([
    prisma.factura.findMany({
      select: {
        id: true,
        uuid: true,
        serie: true,
        folio: true,
        fechaEmision: true,
        moneda: true,
        tipoCambio: true,
        tipoComprobante: true,
        formaPago: true,
        metodoPago: true,
        subTotal: true,
        total: true,
        estatus: true,
        complementosPago: true,
        createdAt: true,
        empresa: {
          select: {
            id: true,
            razonSocial: true,
            rfc: true
          }
        },
        cliente: {
          select: {
            id: true,
            razonSocial: true,
            rfc: true
          }
        }
      },
      where: whereClause,
      orderBy: { fechaEmision: orden === 'asc' ? 'asc' : 'desc' },
      skip: skip,
      take: limit
    }),
    prisma.factura.count({ where: whereClause }),
    prisma.empresa.findMany({
      where: user?.empresasIds?.length > 0 ? { id: { in: user.empresasIds } } : {},
      select: { id: true, razonSocial: true },
      orderBy: { razonSocial: 'asc' }
    }),
    prisma.cliente.findMany({
      where: rpClientes,
      select: { id: true, razonSocial: true },
      orderBy: { razonSocial: 'asc' }
    })
  ])

  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Historial de Facturas Timbradas</h1>
        <Link href="/facturas/nuevo">
          <button className="btn">⭐ Emitir Nueva Factura</button>
        </Link>
      </div>
      
      <SearchBar placeholder="Búsqueda libre por Factura, UUID o Nombre de Empresa..." />
      <br/>
 
      <FacturasClient 
        facturasInitial={facturas} 
        empresas={empresas} 
        clientes={clientes}
        page={page} 
        totalPages={totalPages} 
        totalCount={totalCount} 
      />
    </div>
  )
}
