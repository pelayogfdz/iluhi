'use client';

import { useEffect, useState } from 'react';
import { syncAndCheckLogos } from '../empresas/logoAcciones';

export default function LogoAlert() {
  const [missing, setMissing] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  const checkLogos = async () => {
    try {
      const res = await syncAndCheckLogos();
      if (res.success) {
        setMissing(res.missingLogos || []);
        if (res.missingLogos && res.missingLogos.length > 0) {
          // If a new missing logo is found, un-dismiss the alert
          setDismissed(false);
        }
      }
    } catch (error) {
      console.error("Error al verificar logos:", error);
    }
  };

  useEffect(() => {
    // Initial check
    checkLogos();

    // Check every minute (60000 ms)
    const intervalId = setInterval(checkLogos, 60000);

    return () => clearInterval(intervalId);
  }, []);

  if (missing.length === 0 || dismissed) {
    return null;
  }

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 relative rounded shadow-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0 text-red-500">
          ⚠️
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Falta configuración de Logotipo en Facturapi
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              Las siguientes empresas no tienen un logotipo configurado en Facturapi. Por favor, suba el logotipo directamente en su cuenta de Facturapi para que se sincronice automáticamente:
            </p>
            <ul className="list-disc pl-5 mt-1">
              {missing.map((nombre, idx) => (
                <li key={idx} className="font-semibold">{nombre}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              onClick={() => setDismissed(true)}
              className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
            >
              <span className="sr-only">Descartar</span>
              ✖
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
