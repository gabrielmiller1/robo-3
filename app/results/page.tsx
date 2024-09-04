"use client";

import { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";

interface ValidationReport {
  url: string;
  images: { extensaoImagemTest?: TestStatus; pesoImagemTest?: TestStatus }[];
  html: { extensaoHtmlTest?: TestStatus }[];
  fonts: { fontsTest?: TestStatus }[];
  externalFiles: { arquivosComChamadasExternasTest?: TestStatus }[];
}

interface TestStatus {
  testPassed: boolean;
  notPassedUrls?: string[];
}

interface ModalData {
  url: string;
  column: string;
  notPassedUrls?: string[];
}

function FileWarningIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export default function Component() {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [validationReports, setValidationReports] = useState<ValidationReport[]>([]);

  useEffect(() => {
    const fetchResults = () => {
      try {
        const data = localStorage.getItem('validationReports');
        if (data) {
          const parsedData = JSON.parse(data);
          const reports = parsedData.reports;

          if (Array.isArray(reports)) {
            setValidationReports(reports);
          } else {
            throw new Error('Os dados recuperados não são um array de objetos ValidationReport.');
          }
        } else {
          // TODO - Implementar erro
          // throw new Error('Nenhum resultado encontrado');
        }
      } catch (error) {
        console.error("Erro ao carregar resultados:", error);
        setValidationReports([]);
      }
    };

    fetchResults();
  }, []);

  const getTestStatus = (test: TestStatus, url: string, column: string) => {
    return test.testPassed ? (
      <div className="mx-auto flex max-w-24 items-center justify-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-600">
        OK
      </div>
    ) : (
      <div className="max-w-26 mx-auto">
        <div className="flex items-center justify-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-600">
          <button
            onClick={() => {
              setModalData({ url, column, notPassedUrls: test.notPassedUrls });
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-1 text-red-500 hover:text-red-700"
          >
            Pendente
            <FileWarningIcon className="size-4" />
          </button>
        </div>
      </div>
    );
  };

  const clearResults = async () => {
    try {
      // TODO - Será o endpoint para limpar os resultados.
      // const response = await fetch('/api/clear-results', { method: 'DELETE' });
      // if (!response.ok) {
      //   throw new Error('Erro ao apagar resultados');
      // }
      setValidationReports([]);
      localStorage.removeItem('validationReports'); // Limpar o localStorage
      toast.success('Resultados apagados com sucesso');
    } catch (error) {
      console.error('Erro ao apagar resultados:', error);
      toast.error('Falha ao apagar resultados');
    }
  };

  return (
    <div className="bg-background text-foreground">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Pacotes BE (Front)</h1>
        </div>
        <div className="mb-4">
          <Button onClick={clearResults} className="bg-yellow-200 text-yellow-600 hover:bg-yellow-300">
            Limpar Resultados
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-muted">
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Dispositivo</th>
                <th className="px-4 py-3 font-medium">Imagem (Extensão)</th>
                <th className="px-4 py-3 font-medium">Imagem (Peso)</th>
                <th className="px-4 py-3 font-medium">HTML (Extensão)</th>
                <th className="px-4 py-3 font-medium">Fonts (Fonts Internas)</th>
                <th className="px-4 py-3 font-medium">Arquivos Externos</th>
              </tr>
            </thead>
            <tbody>

              {Array.isArray(validationReports) && validationReports.length > 0 ? (
                validationReports.map((report, index) => (
                  <tr key={index} className="border border-muted">
                    <td className="p-4">
                      <div className="font-medium">{report.url.split(" - ")[0]}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-center">{report.url.includes("mobile") ? "Mobile" : "Desktop"}</div>
                    </td>
                    <td className="p-4">
                      {report.images[0]?.extensaoImagemTest &&
                        getTestStatus(report.images[0].extensaoImagemTest, report.url, "Imagem (Extensão, imagens devem ser carregadas como webp)")}
                    </td>
                    <td className="p-4">
                      {report.images[0]?.pesoImagemTest &&
                        getTestStatus(report.images[0].pesoImagemTest, report.url, "Imagem (Peso > 500Kb)")}
                    </td>
                    <td className="p-4">
                      {report.html[0]?.extensaoHtmlTest &&
                        getTestStatus(report.html[0].extensaoHtmlTest, report.url, "HTML (Extensão deve ser .shtm)")}
                    </td>
                    <td className="p-4 text-center">
                      {report.fonts[0]?.fontsTest &&
                        getTestStatus(report.fonts[0].fontsTest, report.url, "Fonts (Fonts Internas, apenas fonts internas Bradesco)")}
                    </td>
                    <td className="p-4">
                      {report.externalFiles[0]?.arquivosComChamadasExternasTest &&
                        getTestStatus(report.externalFiles[0].arquivosComChamadasExternasTest, report.url, "Arquivos Externos, não permitido chamada de arquivos externos")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-4 text-center">Nenhum resultado encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTitle>Alerta</DialogTitle>
          <DialogContent className="w-full max-w-[1200px]">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium">{modalData?.column}</span>
                <FileWarningIcon className="size-4 text-red-500" />
              </div>
              <p className="text-md">URL: <a href={modalData?.url.split(' - ')[0]} className="underline">{modalData?.url.split(' - ')[0]}</a></p>
              {modalData?.notPassedUrls && modalData.notPassedUrls.length > 0 ? (
                <div className="mt-4 max-h-[300px] w-full max-w-[1100px] overflow-auto rounded-md border border-gray-200 p-4">
                  <ul className="list-decimal px-6 text-left">
                    {modalData.notPassedUrls.map((failedUrl, index) => (
                      <li key={index} className="cursor-pointer whitespace-nowrap break-words text-sm text-red-600 hover:underline">
                        {failedUrl}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma URL falhou neste teste.</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setIsModalOpen(false)}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
