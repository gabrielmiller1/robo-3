// app/api/validate/route.ts

import { NextResponse } from 'next/server';
import puppeteer, { Page, Browser } from 'puppeteer';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MAX_IMAGE_SIZE_KB = 500;

async function ensureResultsDirExists(): Promise<void> {
  const resultsDir = join(process.cwd(), 'public', 'data');
  try {
    await mkdir(resultsDir, { recursive: true });
  } catch (error) {
    console.error('Erro ao garantir a criação da pasta de resultados:', error);
    throw new Error('Erro ao garantir a criação da pasta de resultados');
  }
}

interface ValidationReport {
  url: string;
  images: Array<{
    extensaoImagemTest: {
      testPassed: boolean;
      notPassedUrls: string[];
    };
    pesoImagemTest?: {
      testPassed: boolean;
      notPassedUrls: string[];
    };
  }>;
  html: Array<{
    extensaoHtmlTest: {
      testPassed: boolean;
      notPassedUrls: string[];
    };
  }>;
  fonts: Array<{
    fontsTest: {
      testPassed: boolean;
      notPassedUrls: string[];
    };
  }>;
  externalFiles: Array<{
    arquivosComChamadasExternasTest: {
      testPassed: boolean;
      notPassedUrls: string[];
    };
  }>;
  passedInternalization: boolean;
}

async function validateImages(page: Page, baseDomain: string): Promise<ValidationReport['images']> {
  const imageRequests = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map((img: HTMLImageElement) => img.src);
  });

  // Inicialize results com tipos explícitos e assegure que o array não esteja vazio
  const results: {
    extensaoImagemTest: {
      testPassed: boolean;
      notPassedUrls: string[];
    };
    pesoImagemTest: {
      testPassed: boolean;
      notPassedUrls: string[];
    };
  }[] = [
    {
      extensaoImagemTest: {
        testPassed: true,
        notPassedUrls: [],
      },
      pesoImagemTest: {
        testPassed: true,
        notPassedUrls: [],
      },
    },
  ];

  const imageTestResults = results[0];

  for (const imageUrl of imageRequests) {
    if (imageUrl.startsWith(baseDomain)) {
      try {
        const response = await page.goto(imageUrl, { timeout: 60000 });
        if (response) {
          const buffer = await response.buffer();
          const sizeKB = buffer.length / 1024;
          const format = imageUrl.split('.').pop();

          if (format !== 'webp' && format !== 'svg') {
            imageTestResults.extensaoImagemTest.testPassed = false;
            imageTestResults.extensaoImagemTest.notPassedUrls.push(imageUrl);
          }
          if (sizeKB > MAX_IMAGE_SIZE_KB) {
            imageTestResults.pesoImagemTest.testPassed = false;
            imageTestResults.pesoImagemTest.notPassedUrls.push(imageUrl);
          }
        }
      } catch (error) {
        console.error(`Erro ao acessar a imagem ${imageUrl}: ${(error as Error).message}`);
      }
    }
  }

  return results; // Retorna o resultado corretamente
}

async function validateHtml(url: string): Promise<ValidationReport['html']> {
  const htmlExtensionValid = url.endsWith('.shtm');
  return [{
    extensaoHtmlTest: {
      testPassed: htmlExtensionValid,
      notPassedUrls: htmlExtensionValid ? [] : [url],
    },
  }];
}

async function validateExternalFiles(networkRequests: Array<{ url: string, initiator: any }>, baseDomain: string): Promise<ValidationReport['externalFiles']> {
  const allowedDomains = [
    'https://www.google.com',
    'https://www.google.com.br',
    'https://googleads.g.doubleclick.net',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://connect.facebook.net',
    'https://t.co',
    'https://analytics.twitter.com',
    'https://td.doubleclick.net',
    'http://static.ads-twitter.com',
    'https://static.ads-twitter.com/uwt.js',
    'https://analytics.google.com',
    'https://stats.g.doubleclick.net'
  ];

  const allowedInitiators = [
    'http://static.ads-twitter.com/uwt.js'
  ];

  const isAllowedUrl = (url: string): boolean => {
    if (url.startsWith('data:')) {
      return true;
    }

    const parsedUrl = new URL(url);
    return allowedDomains.some(domain => parsedUrl.origin === domain);
  };

  const isAllowedInitiator = (initiator: any): boolean => {
    return initiator && initiator.url && allowedInitiators.includes(initiator.url);
  };

  const externalRequests = networkRequests.filter(req => {
    const url = new URL(req.url);
    return !req.url.startsWith(baseDomain) && !isAllowedUrl(req.url) && !isAllowedInitiator(req.initiator);
  });

  return [{
    arquivosComChamadasExternasTest: {
      testPassed: externalRequests.length === 0,
      notPassedUrls: externalRequests.map(req => req.url),
    },
  }];
}

interface NetworkRequest {
  url: string;
  type: string; // Inclui a propriedade type
}

async function validateFonts(networkRequests: NetworkRequest[]): Promise<ValidationReport['fonts']> {
  // Filtra as requisições de fonte
  const fontRequests = networkRequests.filter(req => req.type === 'font');

  // Inicializa resultados com tipos explícitos
  const results: {
    fontsTest: {
      testPassed: boolean;
      notPassedUrls: string[];
    };
  } = {
    fontsTest: {
      testPassed: true,
      notPassedUrls: [], // Define explicitamente como string[]
    },
  };

  for (const fontRequest of fontRequests) {
    // Trata caso onde split pode retornar undefined
    const fontParts = fontRequest.url.split('/');
    const fontName = fontParts.pop()?.split('.')[0] ?? '';

    const isFontValid = (font: string): boolean => {
      const fontLower = font.toLowerCase();
      return fontLower.includes('bradesco') || fontLower.includes('sans-serif');
    };

    if (!isFontValid(fontName)) {
      results.fontsTest.testPassed = false;
      results.fontsTest.notPassedUrls.push(fontRequest.url);
    }
  }

  return [results]; // Retorna o resultado corretamente
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { urls }: { urls?: string[] } = await request.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'URLs inválidas' }, { status: 400 });
    }

    const allReports: ValidationReport[] = [];
    const browser: Browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
      defaultViewport: null,
      timeout: 120000, // 2 minutos
    });

    try {
      for (const url of urls) {
        const viewports = [
          { name: 'desktop', width: 1280, height: 800 },
          { name: 'mobile', width: 375, height: 667, isMobile: true },
        ];

        for (const viewport of viewports) {
          const page: Page = await browser.newPage();
          await page.setViewport(viewport);

          const baseDomain = new URL(url).origin;
          const networkRequests: Array<{ url: string; type: string; initiator: any }> = [];

          await page.setRequestInterception(true);
          page.on('request', (request) => {
            networkRequests.push({
              url: request.url(),
              type: request.resourceType(),
              initiator: request.initiator(),
            });
            request.continue();
          });

          console.log('Iniciando a navegação para:', url);
          try {
            await page.goto(url, { timeout: 120000 });
            console.log('Navegação concluída para:', url);
          } catch (error) {
            console.error(`Erro de navegação para ${url}: ${(error as Error).message}`);
          }

          // Validação
          const images = await validateImages(page, baseDomain);
          const html = await validateHtml(url);
          const fonts = await validateFonts(networkRequests);
          const externalFiles = await validateExternalFiles(networkRequests, baseDomain);

          // Criar Relatório
          const validationReport: ValidationReport = {
            url: `${url} - ${viewport.name}`,
            images: images.length > 0 ? images : [{ extensaoImagemTest: { testPassed: true, notPassedUrls: [] }, pesoImagemTest: { testPassed: true, notPassedUrls: [] } }],
            html: html.length > 0 ? html : [{ extensaoHtmlTest: { testPassed: true, notPassedUrls: [] } }],
            fonts: fonts.length > 0 ? fonts : [{ fontsTest: { testPassed: true, notPassedUrls: [] } }],
            externalFiles: externalFiles.length > 0 ? externalFiles : [{ arquivosComChamadasExternasTest: { testPassed: true, notPassedUrls: [] } }],
            passedInternalization: true,
          };

          allReports.push(validationReport);
          await page.close();
        }
      }

      // Retornar os dados como resposta JSON
      return NextResponse.json({ reports: allReports });

    } catch (error) {
      console.error('Erro ao processar as validações:', error);
      return NextResponse.json({ error: 'Erro ao processar as validações' }, { status: 500 });
    } finally {
      await browser.close();
    }

  } catch (error) {
    console.error('Erro ao processar a requisição:', error);
    return NextResponse.json({ error: 'Erro ao processar a requisição' }, { status: 500 });
  }
}
