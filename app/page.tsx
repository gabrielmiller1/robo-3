"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import LogoBradesco from '../public/logo-bradesco.png'
import Image from 'next/image'
import { toast } from 'react-toastify';

export default function Component() {
  const [urls, setUrls] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

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

      // Armazene os resultados no localStorage
      localStorage.setItem('validationReports', JSON.stringify(data));

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
          {/* <Image src={LogoBradesco} alt="Logo Bradesco" width={500} height={500} className="size-25 text-primary-foreground" /> */}
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
  )
}
