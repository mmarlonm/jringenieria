import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ServerStatusService } from '../../../services/server-status.service';

@Component({
  selector: 'server-status-indicator',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="server-indicator" [class.online]="isOnline$ | async" [class.offline]="!(isOnline$ | async)">
      <div class="indicator-dot" [matTooltip]="(isOnline$ | async) ? 'Servidor en línea' : 'Servidor desconectado'"></div>
      <span class="indicator-text">{{ (isOnline$ | async) ? 'En línea' : 'Sin conexión' }}</span>
    </div>
  `,
  styles: [`
    .server-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .server-indicator.online {
      background: #d4edda;
      color: #155724;
    }

    .server-indicator.offline {
      background: #f8d7da;
      color: #721c24;
    }

    .indicator-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    .server-indicator.online .indicator-dot {
      background: #28a745;
      box-shadow: 0 0 8px rgba(40, 167, 69, 0.6);
    }

    .server-indicator.offline .indicator-dot {
      background: #dc3545;
      box-shadow: 0 0 8px rgba(220, 53, 69, 0.6);
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.6;
      }
    }

    .indicator-text {
      white-space: nowrap;
    }
  `]
})
export class ServerStatusIndicatorComponent implements OnInit {
  isOnline$: any;

  constructor(private serverStatusService: ServerStatusService) {}

  ngOnInit(): void {
    this.isOnline$ = this.serverStatusService.serverStatus$;
  }
}
