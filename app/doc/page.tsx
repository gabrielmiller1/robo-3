const testsInfo = [
  {
    name: "Imagem (Extensão)",
    description: "Verifica se as imagens possuem extensão adequada. Apenas imagens nos formatos 'webp' e 'svg' são aceitas.",
    criteria: "Imagens nos formatos 'webp' e 'svg' passam no teste."
  },
  {
    name: "Imagem (Peso)",
    description: "Verifica se o tamanho das imagens é menor ou igual a 500KB para garantir que o carregamento da página seja rápido.",
    criteria: "Imagens com tamanho menor ou igual a 500KB passam no teste."
  },
  {
    name: "HTML (Extensão)",
    description: "Valida se a URL termina com a extensão '.shtm'.",
    criteria: "URLs que terminam com '.shtm' passam no teste."
  },
  {
    name: "Fonts (Fonts Internas)",
    description: "Verifica se as fontes utilizadas são internas e pertencem ao conjunto de fontes aceitáveis, como 'bradesco' ou 'sans-serif'.",
    criteria: "Apenas fontes que incluem 'bradesco' ou 'sans-serif' passam no teste."
  },
  {
    name: "Arquivos Externos",
    description: "Verifica se não há chamadas externas não permitidas para scripts ou recursos de terceiros. Apenas URLs de domínios permitidos são aceitas.",
    criteria: "Chamadas para URLs de domínios na lista de permissões ou que começam com 'data:' são aceitas."
  }
];

export default function TestsInfoPage() {
  return (
    <div className="container p-8">
      <h1 className="mb-6 text-3xl font-bold">Informações dos Testes</h1>
      {testsInfo.map((test, index) => (
        <div key={index} className="mb-4 rounded-md border border-gray-200 p-4">
          <h2 className="text-xl font-semibold">{test.name}</h2>
          <p className="text-md mt-2">{test.description}</p>
          <p className="tex-sm mt-1 text-muted-foreground">
            <strong>Critério de Aceitação:</strong> {test.criteria}
          </p>
        </div>
      ))}
    </div>
  );
}
