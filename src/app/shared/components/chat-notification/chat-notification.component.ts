import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

@Component({
    selector: 'app-chat-notification',
    standalone: true,
    imports: [CommonModule, MatIconModule, MatButtonModule],
    template: `
    <div class="flex items-start p-4 min-w-80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden group transition-all duration-300 hover:scale-[1.02]">
      <!-- Indicador lateral -->
      <div class="absolute inset-y-0 left-0 w-1.5 bg-blue-500 rounded-r-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
      
      <div class="flex-shrink-0 mr-4">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/10">
          <mat-icon class="!w-6 !h-6 !text-2xl text-white">chat_bubble</mat-icon>
        </div>
      </div>
      
      <div class="flex-grow pt-0.5">
        <div class="flex justify-between items-start mb-1">
          <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none group-hover:text-blue-500 transition-colors">
            {{ data.remitenteName || 'Nuevo mensaje' }}
          </h4>
          <span class="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">Ahora</span>
        </div>
        <p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed italic">
          "{{ data.contenido }}"
        </p>
      </div>

      <button mat-icon-button (click)="snackBarRef.dismiss()" class="!w-8 !h-8 !min-w-0 flex-shrink-0 -mr-2 -mt-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all rounded-xl">
        <mat-icon class="!w-4 !h-4 !text-base">close</mat-icon>
      </button>
    </div>
  `,
    styles: [`
    :host {
      display: block;
    }
  `],
    encapsulation: ViewEncapsulation.None
})
export class ChatNotificationComponent {
    constructor(
        @Inject(MAT_SNACK_BAR_DATA) public data: { remitenteName: string; contenido: string },
        public snackBarRef: MatSnackBarRef<ChatNotificationComponent>
    ) { }
}
