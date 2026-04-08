import { PrismaClient } from '@prisma/client'
import Link from 'next/link'

const prisma = new PrismaClient()

export default async function ProductosPage() {
  const productos = await prisma.producto.findMany({ include: { empresa: true } })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <h1>Catálogo de Productos y Servicios</h1>
         <Link href="/productos/nuevo"><button className="btn">Nuevo Concepto</button></Link>
      </div>
      
      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <table className="table-glass">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>No. Identificación</th>
              <th>Descripción</th>
              <th>Clave SAT</th>
              <th>Unidad SAT</th>
              <th>Precio Venta</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  No hay productos registrados. Agrega los servicios y conceptos ligados a una empresa.
                </td>
              </tr>
            ) : productos.map((p) => (
              <tr key={p.id}>
                <td>{p.empresa.razonSocial}</td>
                <td>{p.noIdentificacion}</td>
                <td>{p.descripcion}</td>
                <td>{p.claveProdServ}</td>
                <td>{p.claveUnidad}</td>
                <td>${p.precio.toFixed(2)}</td>
                <td><button className="btn" style={{padding: '0.4rem 1rem'}}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
