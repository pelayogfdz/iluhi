import { NextResponse } from 'next/server';
import { facturapiLive } from '../../../../lib/facturapi';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 3) {
      return NextResponse.json({ results: [] });
    }

    const searchResults = await facturapiLive.catalogs.searchProducts({ q });
    return NextResponse.json({ results: searchResults.data || [] });
  } catch (error) {
    console.error("Error fetching SAT products:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
