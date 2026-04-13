import { NextResponse } from 'next/server';
import facturapi from '../../../../lib/facturapi';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchResults = await facturapi.catalogs.searchUnits({ q });
    return NextResponse.json({ results: searchResults.data || [] });
  } catch (error) {
    console.error("Error fetching SAT units:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
