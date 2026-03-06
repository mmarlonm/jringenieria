import { Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Toaster, sileo } from 'sileo';

@Component({
  selector: 'app-sileo-wrapper',
  standalone: true,
  template: '<div #sileoContainer></div>',
  encapsulation: ViewEncapsulation.None,
  styles: [`
    /* Sileo Toast Animations and Gooey Effect */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    /* Variables de marca y contraste para Sileo (Forzando Blanco) */
    :root {
      --sileo-text-title: #ffffff !important;
      --sileo-text-desc: rgba(255, 255, 255, 0.9) !important;
      --sileo-bg-pill: #1e293b !important; /* Azul cobalto/oscuro para contraste */
      --sileo-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2) !important;
    }

    .dark {
      --sileo-bg-pill: #0f172a !important; /* Aún más oscuro en dark mode */
    }

    /* Limpiar absolutamente todos los contenedores de Sileo */
    [data-sileo-viewport],
    [data-sileo-viewport] *,
    [data-sileo-group],
    [data-sileo-content] {
      background-color: transparent !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    /* Ubicación del viewport */
    [data-sileo-viewport] {
      z-index: 2147483647 !important;
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      width: 380px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-end !important;
      pointer-events: none !important;
    }

    /* La píldora (el cuerpo visible) - EL ÚNICO CON FONDO Y SHADOW */
    [data-sileo-pill] {
      background-color: var(--sileo-bg-pill) !important;
      pointer-events: auto !important;
      box-shadow: var(--sileo-shadow) !important;
      border-radius: 9999px !important;
      overflow: visible !important;
    }

    /* Forzar visibilidad y color BLANCO de las letras */
    [data-sileo-title] {
      color: var(--sileo-text-title) !important;
      font-weight: 700 !important;
      font-family: 'Inter', sans-serif !important;
      font-size: 15px !important;
      line-height: 1.2 !important;
      display: block !important;
      opacity: 1 !important;
      visibility: visible !important;
      text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
    }

    [data-sileo-description] {
      color: var(--sileo-text-desc) !important;
      font-family: 'Inter', sans-serif !important;
      font-size: 13px !important;
      line-height: 1.4 !important;
      display: block !important;
      opacity: 1 !important;
      visibility: visible !important;
    }

    /* Asegurar que el icono no tenga fondos raros */
    [data-sileo-svg] {
      background: transparent !important;
    }

    /* Estilo para el "Tab Label" (OPCIONAL: Usamos el title para esto) */
    /* Si queremos que el título esté en el tab, necesitamos moverlo con transform */
    /* Pero por ahora, mantenemos la estructura limpia */
  `]
})
export class SileoWrapperComponent implements OnInit, OnDestroy {
  @ViewChild('sileoContainer', { static: true }) container!: ElementRef;
  private root!: ReactDOM.Root;

  ngOnInit(): void {
    const isDark = document.body.classList.contains('dark') || document.documentElement.classList.contains('dark');

    try {
      this.root = ReactDOM.createRoot(this.container.nativeElement);
      this.root.render(
        React.createElement(Toaster as any, {
          position: 'top-right',
          theme: isDark ? 'dark' : 'light'
        })
      );
    } catch (error) {
      console.error('[SileoWrapper] Error rendering Toaster:', error);
    }
  }

  ngOnDestroy(): void {
    if (this.root) {
      this.root.unmount();
    }
  }
}
