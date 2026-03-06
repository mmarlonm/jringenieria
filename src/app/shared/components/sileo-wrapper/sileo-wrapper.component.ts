import { Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { Toaster } from 'sileo';

@Component({
  selector: 'app-sileo-wrapper',
  standalone: true,
  template: '<div #sileoContainer></div>',
  encapsulation: ViewEncapsulation.None,
  styles: [`
    /* Sileo Toast Animations and Gooey Effect */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    .sileo-toaster {
      --sileo-bg: #fff;
      --sileo-text: #171717;
      --sileo-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --sileo-radius: 1rem;
      font-family: 'Inter', sans-serif !important;
    }

    body.dark .sileo-toaster {
      --sileo-bg: #1e293b;
      --sileo-text: #f8fafc;
    }

    /* Ensuring the React container is visible and correctly positioned */
    app-sileo-wrapper > div {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 99999;
      pointer-events: none;
    }

    app-sileo-wrapper > div * {
      pointer-events: auto;
    }
  `]
})
export class SileoWrapperComponent implements OnInit, OnDestroy {
  @ViewChild('sileoContainer', { static: true }) container!: ElementRef;
  private root!: ReactDOM.Root;

  ngOnInit(): void {
    this.root = ReactDOM.createRoot(this.container.nativeElement);
    this.root.render(
      React.createElement(Toaster as any, {
        position: 'top-right',
        theme: (document.body.classList.contains('dark') ? 'dark' : 'light') as any
      })
    );
  }

  ngOnDestroy(): void {
    if (this.root) {
      this.root.unmount();
    }
  }
}
