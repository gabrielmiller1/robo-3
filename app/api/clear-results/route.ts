// app/api/clear-results/route.ts

import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE() {
  try {
    const filePath = join(process.cwd(), 'public', 'results', 'results.json');
    await unlink(filePath);
    return NextResponse.json({ message: 'Resultados apagados com sucesso' });
  } catch (error) {
    console.error('Erro ao apagar o arquivo:', error);
    return NextResponse.json({ error: 'Erro ao apagar resultados' }, { status: 500 });
  }
}
