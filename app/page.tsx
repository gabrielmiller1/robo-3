"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from 'react-toastify';
import { ValidationReport } from "./api/validate/route"

export default function Component() {
  const [urls, setUrls] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowForm(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: urls.split(',').map(url => url.trim()) }),
      });

      if (!response.ok) {
        throw new Error('Erro na validação das URLs.');
      }

      const data = await response.json();

      const existingReports = localStorage.getItem('validationReports');
      let existingReportsData: { reports: ValidationReport[] } = { reports: [] };

      if (existingReports) {
        try {
          const parsedData = JSON.parse(existingReports);
          if (parsedData && Array.isArray(parsedData.reports)) {
            existingReportsData = parsedData;
          } else {
            console.warn('Dados existentes no localStorage estão em um formato inesperado.');
          }
        } catch (error) {
          console.error("Erro ao parsear os dados existentes do localStorage:", error);
        }
      }

      const updatedReports = [...existingReportsData.reports, ...data.reports];

      localStorage.setItem('validationReports', JSON.stringify({ reports: updatedReports }));

      toast.success("URLs enviadas e validadas com sucesso!");

      const timer2 = setTimeout(() => {
        router.push('/results');
      }, 2000);
      return () => clearTimeout(timer2);
    } catch (error) {
      console.error("Erro ao validar URLs:", error);
      toast.error("Erro ao validar URLs. Por favor, tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen-minus-4rem flex flex-col items-center justify-center bg-primary py-4">
      {!showForm && (
        <div className="animate-bounce">
          <p className="text-xl text-primary-foreground">Carregando...</p>
        </div>
      )}
      {showForm && (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Envie suas URLs</CardTitle>
            <CardDescription>Insira múltiplas URLs separadas por vírgula.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder="https://example.com, https://example.org, https://example.net"
                className="min-h-[100px]"
              />
              <div className="mt-4 flex justify-end">
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? 'Processando...' : 'Enviar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
