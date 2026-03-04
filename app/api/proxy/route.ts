import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validação básica de URL
    let url: URL;
    try {
      // Adiciona https:// se não tiver protocolo
      const urlString = targetUrl.startsWith('http') 
        ? targetUrl 
        : `https://${targetUrl}`;
      url = new URL(urlString);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Busca o HTML da URL alvo
    const response = await axios.get(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 10000,
      maxRedirects: 5,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Remove headers de segurança do HTML (meta tags)
    $('meta[http-equiv="X-Frame-Options"]').remove();
    $('meta[http-equiv="Content-Security-Policy"]').remove();
    $('meta[http-equiv="Frame-Options"]').remove();

    // Reescreve todos os src e href para caminhos absolutos
    const baseUrl = `${url.protocol}//${url.host}`;

    // Processa tags com src
    $('img[src], script[src], iframe[src], video[src], audio[src]').each((_, el) => {
      const $el = $(el);
      const src = $el.attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('data:')) {
        const absoluteUrl = src.startsWith('/')
          ? `${baseUrl}${src}`
          : `${baseUrl}/${src}`;
        $el.attr('src', absoluteUrl);
      }
    });

    // Processa tags com href (links, stylesheets)
    $('a[href], link[href]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        const absoluteUrl = href.startsWith('/')
          ? `${baseUrl}${href}`
          : `${baseUrl}/${href}`;
        $el.attr('href', absoluteUrl);
      }
    });

    // Processa background-image e outros atributos style
    $('[style]').each((_, el) => {
      const $el = $(el);
      const style = $el.attr('style') || '';
      const updatedStyle = style.replace(
        /url\(['"]?([^'")]+)['"]?\)/g,
        (match, urlPath) => {
          if (urlPath.startsWith('http') || urlPath.startsWith('//') || urlPath.startsWith('data:')) {
            return match;
          }
          const absoluteUrl = urlPath.startsWith('/')
            ? `${baseUrl}${urlPath}`
            : `${baseUrl}/${urlPath}`;
          return `url('${absoluteUrl}')`;
        }
      );
      $el.attr('style', updatedStyle);
    });

    // Injeta o script tracker.js antes do fechamento do </body>
    const trackerScript = `
      <script>
        (function() {
          console.log('CRT Markup Tracker injected');
          
          // Função para obter o seletor CSS de um elemento
          function getSelector(element) {
            if (element.id) {
              return '#' + element.id;
            }
            
            let selector = element.tagName.toLowerCase();
            if (element.className && typeof element.className === 'string') {
              const classes = element.className.split(' ').filter(c => c).join('.');
              if (classes) {
                selector += '.' + classes;
              }
            }
            
            // Adiciona contexto do pai se necessário
            if (element.parentElement) {
              const parentSelector = getSelector(element.parentElement);
              selector = parentSelector + ' > ' + selector;
            }
            
            return selector;
          }
          
          // Função para obter altura e largura total do documento
          function getDocumentSize() {
            const body = document.body;
            const html = document.documentElement;
            
            const height = Math.max(
              body.scrollHeight, body.offsetHeight,
              html.clientHeight, html.scrollHeight, html.offsetHeight
            );
            
            const width = Math.max(
              body.scrollWidth, body.offsetWidth,
              html.clientWidth, html.scrollWidth, html.offsetWidth
            );
            
            return { width, height };
          }
          
          // Envia informações de scroll para o pai
          function sendScrollInfo() {
            const docSize = getDocumentSize();
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({
                type: 'CARTHAGOS_SCROLL',
                data: {
                  scrollX: window.scrollX || window.pageXOffset,
                  scrollY: window.scrollY || window.pageYOffset,
                  docWidth: docSize.width,
                  docHeight: docSize.height,
                  viewportWidth: window.innerWidth,
                  viewportHeight: window.innerHeight
                }
              }, '*');
            }
          }
          
          // Envia scroll info periodicamente e no evento de scroll
          window.addEventListener('scroll', sendScrollInfo, { passive: true });
          window.addEventListener('resize', sendScrollInfo, { passive: true });
          setInterval(sendScrollInfo, 500);
          sendScrollInfo();
          
          // Adiciona event listener de clique
          document.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Calcula coordenadas ABSOLUTAS no documento (não no viewport)
            const docSize = getDocumentSize();
            const scrollX = window.scrollX || window.pageXOffset;
            const scrollY = window.scrollY || window.pageYOffset;
            
            // Posição absoluta no documento = posição no viewport + scroll
            const absoluteX = e.clientX + scrollX;
            const absoluteY = e.clientY + scrollY;
            
            // Converte para porcentagem do documento total
            const x = (absoluteX / docSize.width) * 100;
            const y = (absoluteY / docSize.height) * 100;
            
            const selector = getSelector(e.target);
            
            // Envia mensagem para a janela pai
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({
                type: 'CARTHAGOS_CLICK',
                data: {
                  x: x,
                  y: y,
                  selector: selector,
                  element: e.target.tagName,
                  timestamp: Date.now(),
                  docWidth: docSize.width,
                  docHeight: docSize.height
                }
              }, '*');
            }
          }, true);
          
          // Listen for scroll commands from parent
          window.addEventListener('message', function(e) {
            if (e.data.type === 'CARTHAGOS_SCROLL_TO') {
              const { x, y } = e.data.data;
              const docSize = getDocumentSize();
              
              // Convert percentage to pixels
              const targetX = (x / 100) * docSize.width;
              const targetY = (y / 100) * docSize.height;
              
              // Scroll to position (centered in viewport)
              window.scrollTo({
                left: targetX - (window.innerWidth / 2),
                top: targetY - (window.innerHeight / 2),
                behavior: 'smooth'
              });
            }
          });
        })();
      </script>
    `;

    // Insere o script antes do </body>
    if ($('body').length > 0) {
      $('body').append(trackerScript);
    } else {
      $('html').append(trackerScript);
    }

    // Retorna o HTML modificado
    const modifiedHtml = $.html();

    return new NextResponse(modifiedHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch URL',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
