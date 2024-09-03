// app/api/validate/route.ts

import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MAX_IMAGE_SIZE_KB = 500;

async function ensureResultsDirExists() {
  const resultsDir = join(process.cwd(), 'public', 'results');
  try {
    await mkdir(resultsDir, { recursive: true });
  } catch (error) {
    console.error('Erro ao garantir a criação da pasta de resultados:', error);
    throw new Error('Erro ao garantir a criação da pasta de resultados');
  }
}

export async function POST(request: Request) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'URLs inválidas' }, { status: 400 });
    }

    const allReports: any[] = [];
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
    });

    try {
      for (const url of urls) {
        const viewports = [
          { name: 'desktop', width: 1280, height: 800 },
          { name: 'mobile', width: 375, height: 667, isMobile: true },
        ];

        for (const viewport of viewports) {
          const page = await browser.newPage();
          await page.setViewport(viewport);

          let validationReport = {
            url: `${url} - ${viewport.name}`,
            images: [
              {
                extensaoImagemTest: {
                  testPassed: true,
                  notPassedUrls: [],
                },
              },
              {
                pesoImagemTest: {
                  testPassed: true,
                  notPassedUrls: [],
                },
              },
            ],
            html: [
              {
                extensaoHtmlTest: {
                  testPassed: true,
                  notPassedUrls: [],
                },
              },
            ],
            fonts: [
              {
                fontsTest: {
                  testPassed: true,
                  notPassedUrls: [],
                },
              },
            ],
            externalFiles: [
              {
                arquivosComChamadasExternasTest: {
                  testPassed: true,
                  notPassedUrls: [],
                },
              },
            ],
            passedInternalization: true,
          };

          const baseDomain = new URL(url).origin;
          const networkRequests: any[] = [];

          await page.setRequestInterception(true);
          page.on('request', (request) => {
            networkRequests.push({
              url: request.url(),
              type: request.resourceType(),
              initiator: request.initiator(),
            });
            request.continue();
          });

          try {
            await page.goto(url, { timeout: 60000 }); // Ajusta o timeout para 60 segundos
          } catch (error) {
            if (error instanceof Error) {
              console.error(`Erro de navegação para ${url}: ${error.message}`);
            } else {
              console.error(`Erro de navegação para ${url}: ${error}`);
            }
            validationReport.passedInternalization = false;
          }

          // Validação de Imagens
          const imageResults = networkRequests.filter(req => req.type === 'image');

          for (const imageRequest of imageResults) {
            const imageUrl = imageRequest.url;
            if (imageUrl.startsWith(baseDomain)) {
              try {
                const response = await page.goto(imageUrl, { timeout: 60000 });
                if (response) {
                  const buffer = await response.buffer();
                  const sizeKB = buffer.length / 1024; // Tamanho em KB
                  const format = imageUrl.split('.').pop();

                  if (format !== 'webp' && format !== 'svg') {
                    validationReport.images[0].extensaoImagemTest.testPassed = false;
                    validationReport.images[0].extensaoImagemTest.notPassedUrls.push(imageUrl);
                  }
                  if (sizeKB > MAX_IMAGE_SIZE_KB) {
                    validationReport.images[1].pesoImagemTest.testPassed = false;
                    validationReport.images[1].pesoImagemTest.notPassedUrls.push(imageUrl);
                  }
                }
              } catch (error) {
                console.error(`Erro ao acessar a imagem ${imageUrl}: ${error.message}`);
              }
            }
          }

          // Validação da Extensão do HTML
          const htmlExtensionValid = url.endsWith('.shtm');
          validationReport.html[0].extensaoHtmlTest.testPassed = htmlExtensionValid;
          if (!htmlExtensionValid) {
            validationReport.html[0].extensaoHtmlTest.notPassedUrls.push(url);
          }

          // Validação de Arquivos Externos
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
            'https://stats.g.doubleclick.net',
            'https://analytics.google.com',
            'https://static.ads-twitter.com'
          ];

          const allowedInitiators = [
            'http://static.ads-twitter.com/uwt.js'
          ];

          const isAllowedUrl = (url: string) => {
            if (url.startsWith('data:')) {
              return true; // Permite data URLs
            }

            const parsedUrl = new URL(url);
            return allowedDomains.some(domain => parsedUrl.origin === domain);
          };

          const isAllowedInitiator = (initiator: any) => {
            return initiator && initiator.url && allowedInitiators.includes(initiator.url);
          };

          const externalRequests = networkRequests.filter(req => {
            const url = new URL(req.url);
            return !req.url.startsWith(baseDomain) && !isAllowedUrl(req.url) && !isAllowedInitiator(req.initiator);
          });

          if (externalRequests.length > 0) {
            validationReport.externalFiles[0].arquivosComChamadasExternasTest.testPassed = false;
            validationReport.externalFiles[0].arquivosComChamadasExternasTest.notPassedUrls.push(...externalRequests.map(req => req.url));
          }

          // Validação de Fontes
          const fontRequests = networkRequests.filter(req => req.type === 'font');

          for (const fontRequest of fontRequests) {
            const fontName = fontRequest.url.split('/').pop().split('.')[0];

            const isFontValid = (font: string) => {
              const fontLower = font.toLowerCase();
              return fontLower.includes('bradesco') || fontLower.includes('sans-serif');
            };

            if (!isFontValid(fontName)) {
              validationReport.fonts[0].fontsTest.testPassed = false;
              validationReport.fonts[0].fontsTest.notPassedUrls.push(fontRequest.url);
            }
          }

          validationReport.passedInternalization = validationReport.images[0].extensaoImagemTest.testPassed &&
            validationReport.images[1].pesoImagemTest.testPassed &&
            validationReport.html[0].extensaoHtmlTest.testPassed &&
            validationReport.fonts[0].fontsTest.testPassed &&
            validationReport.externalFiles[0].arquivosComChamadasExternasTest.testPassed;

          allReports.push(validationReport);

          await page.close(); // Garante que a aba é fechada
        }
      }

      // Garante que a pasta de resultados existe
      await ensureResultsDirExists();

      // Define o caminho para salvar o arquivo JSON
      const filePath = join(process.cwd(), 'public', 'results', `results.json`);

      // Salva os resultados no arquivo JSON
      await writeFile(filePath, JSON.stringify(allReports, null, 2), 'utf-8');

      // Retorna o caminho do arquivo JSON para o cliente
      return NextResponse.json({ filePath });

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
