import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Toaster, sileo } from 'sileo';

@Component({
  selector: 'app-sileo-wrapper',
  standalone: true,
  template: '', // No longer using internal template
  encapsulation: ViewEncapsulation.None,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    /* El contenedor global inyectado en el body */
    #sileo-global-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483647 !important; /* Máximo absoluto */
      pointer-events: none;
    }

    /* Posicionamiento del toaster */
    #sileo-global-container [data-sileo-toaster] {
      pointer-events: auto;
      position: fixed !important;
      top: 30px !important; 
      right: 320px !important; /* Separado de la barra lateral de chat */
      z-index: 2147483647 !important;
      font-family: 'Inter', system-ui, sans-serif !important;
    }

    /* Permitimos que Sileo maneje su propio diseño visual (fondos, bordes, sombras)
       al no inyectar backgrounds ni padding que rompan su estructura nativa. */

    #sileo-global-container [data-sileo-svg] { 
      background: transparent !important; 
    }
  `]
})
export class SileoWrapperComponent implements OnInit, OnDestroy {
  private rootTitle = 'sileo-global-container';
  private root!: ReactDOM.Root;
  private toasterContainer!: HTMLDivElement;

  ngOnInit(): void {
    const isDark = document.body.classList.contains('dark') || document.documentElement.classList.contains('dark');

    try {
      console.log('🏗️ [SileoWrapper] Inyectando React Toaster de forma segura en el BODY...');

      let existingContainer = document.getElementById(this.rootTitle) as HTMLDivElement;

      if (existingContainer) {
        existingContainer.remove();
      }

      this.toasterContainer = document.createElement('div');
      this.toasterContainer.id = this.rootTitle;
      document.body.appendChild(this.toasterContainer);

      this.root = (ReactDOM as any).createRoot(this.toasterContainer);
      this.root.render(
        React.createElement(Toaster as any, {
          position: 'top-right',
          theme: isDark ? 'dark' : 'light'
        })
      );
    } catch (error) {
      console.error('[SileoWrapper] Error rendering Toaster in Body:', error);
    }
  }

  ngOnDestroy(): void {
    try {
      if (this.root) {
        // Safe unmount
        setTimeout(() => {
          try { this.root.unmount(); } catch (e) { }
        }, 0);
      }
      if (this.toasterContainer && this.toasterContainer.parentNode) {
        this.toasterContainer.parentNode.removeChild(this.toasterContainer);
      }
    } catch (e) {
      console.error('[SileoWrapper] Cleanup error:', e);
    }
  }
}
