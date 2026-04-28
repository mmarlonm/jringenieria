import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-roadmap',
    standalone: true,
    imports: [CommonModule, MatButtonToggleModule, MatIconModule, MatTooltipModule, FormsModule],
    templateUrl: './roadmap.component.html',
    encapsulation: ViewEncapsulation.None,
    styles: [`
        mat-button-toggle-group {
            box-shadow: none !important;
        }
        .mat-button-toggle-checked {
            background-color: white !important;
            color: #3b82f6 !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
        }
        .dark .mat-button-toggle-checked {
            background-color: #1e293b !important;
            color: #60a5fa !important;
        }
        .event-node {
            transition: transform 0.2s ease-in-out, filter 0.2s ease-in-out;
            transform-origin: center;
            transform-box: fill-box;
        }
        .event-node:hover {
            filter: drop-shadow(0 0 12px currentColor);
            transform: scale(1.8);
            z-index: 50;
        }
    `]
})
export class RoadmapComponent implements OnInit {

    viewMode: 'image' | 'interactive' = 'image';
    currentProgress: number = 0;
    
    // Zoom & Pan State
    zoom = 1;
    panX = 0;
    panY = 0;
    private isPanning = false;
    private startX = 0;
    private startY = 0;

    categories = [
        { name: 'ADMINISTRACIÓN', color: '#0891B2' },
        { name: 'INGENIERÍA', color: '#F59E0B' },
        { name: 'COMERCIALIZACIÓN & MKT', color: '#BE123C' },
        { name: 'SUC. PACHUCA', color: '#16A34A' },
        { name: 'SUC. QUERÉTARO', color: '#92400E' },
        { name: 'SUC. PUEBLA', color: '#7E22CE' }
    ];

    milestones = [
        { month: 'ENERO', x: 80, y: 220, events: [
            { title: 'Publicación Página Web', cat: '#0891B2', x: 130, y: 150 },
            { title: 'Fachada Sucursal 1&2', cat: '#BE123C', x: 180, y: 150 },
            { title: 'Contenido Pagado/Orgánico', cat: '#BE123C', x: 240, y: 320 }
        ], date: new Date(2026, 0, 15) },
        { month: 'FEBRERO', x: 350, y: 220, events: [
            { title: 'Instalación Eléctrica CIAT', cat: '#F59E0B', x: 300, y: 320 },
            { title: 'Fachada Sucursal 3', cat: '#BE123C', x: 420, y: 150 },
            { title: 'Consolidar Presupuesto Anual', cat: '#0891B2', x: 480, y: 320 },
            { title: 'Incorporación Vendedor Mostrador', cat: '#F59E0B', x: 550, y: 320 },
            { title: 'Software 100% Funcional', cat: '#16A34A', x: 620, y: 320 },
            { title: 'Estandarizar Check-list Ingeniería', cat: '#F59E0B', x: 690, y: 150 }
        ], date: new Date(2026, 1, 15) },
        { month: 'MARZO', x: 800, y: 220, events: [
            { title: 'Implementación Catálogos', cat: '#BE123C', x: 740, y: 150 },
            { title: 'Actualización Inventario', cat: '#92400E', x: 860, y: 320 },
            { title: 'Pre-Lanzamiento Foro Energiza', cat: '#BE123C', x: 930, y: 320 },
            { title: 'Implementación Venta en Línea', cat: '#BE123C', x: 1000, y: 150 },
            { title: 'Establecer Dpto RRHH', cat: '#0891B2', x: 1070, y: 320 }
        ], date: new Date(2026, 2, 15) },
        { month: 'ABRIL', x: 1200, y: 220, events: [
            { title: 'Actualización de Inventario', cat: '#16A34A', x: 1140, y: 150 },
            { title: 'Afiliación EMQRO', cat: '#0891B2', x: 1250, y: 320 },
            { title: 'Encuentro Hidalgo-Puebla', cat: '#7E22CE', x: 1300, y: 320 },
            { title: 'Ampliación Cobertura Oro', cat: '#F59E0B', x: 1340, y: 150 },
            { title: 'ENxA ANEAS', cat: '#BE123C', x: 1390, y: 150 }
        ], date: new Date(2026, 3, 15) },
        { month: 'MAYO', x: 1250, y: 500, events: [
            { title: 'Alianzas Estratégicas', cat: '#16A34A', x: 1280, y: 400 },
            { title: 'Afiliación CIMEQ', cat: '#0891B2', x: 1280, y: 450 },
            { title: 'Fachada CIAT', cat: '#BE123C', x: 1320, y: 500 },
            { title: 'Alianzas Estratégicas', cat: '#16A34A', x: 1280, y: 550 },
            { title: 'Certificación ISO 9001', cat: '#0891B2', x: 1300, y: 580 },
            { title: 'Momentum', cat: '#BE123C', x: 1320, y: 620 },
            { title: 'Estandarizar Manuales', cat: '#F59E0B', x: 1280, y: 660 }
        ], date: new Date(2026, 4, 15) },
        { month: 'JUNIO', x: 1000, y: 550, events: [
            { title: 'Apertura CIAT', cat: '#F59E0B', x: 1120, y: 460 },
            { title: 'Papeleo Viaje Brasil Astec', cat: '#0891B2', x: 920, y: 640 },
            { title: 'Cumplimiento 50% Meta', cat: '#7E22CE', x: 860, y: 640 },
            { title: 'Inventario Confiable', cat: '#7E22CE', x: 800, y: 640 }
        ], date: new Date(2026, 5, 15) },
        { month: 'JULIO', x: 650, y: 550, events: [
            { title: 'Show Room Sucursal 1', cat: '#BE123C', x: 720, y: 640 },
            { title: 'Fidelización Cliente', cat: '#F59E0B', x: 580, y: 640 }
        ], date: new Date(2026, 6, 15) },
        { month: 'AGOSTO', x: 300, y: 550, events: [
            { title: 'Certificación Hecho en MX', cat: '#0891B2', x: 420, y: 460 },
            { title: 'Expo Energía', cat: '#7E22CE', x: 360, y: 460 },
            { title: 'Electribi', cat: '#BE123C', x: 300, y: 460 },
            { title: 'Show Room Sucursal 2', cat: '#BE123C', x: 200, y: 640 },
            { title: 'Asistente Técnico WEG', cat: '#F59E0B', x: 120, y: 640 }
        ], date: new Date(2026, 7, 15) },
        { month: 'SEPTIEMBRE', x: 200, y: 880, events: [
            { title: 'Show Room Sucursal 3', cat: '#BE123C', x: 100, y: 960 },
            { title: 'Área Asistencia Técnica', cat: '#16A34A', x: 180, y: 960 },
            { title: 'Pre-Registro Foro Energiza', cat: '#BE123C', x: 300, y: 800 },
            { title: 'Expo Industrial Queretaro', cat: '#BE123C', x: 380, y: 960 }
        ], date: new Date(2026, 8, 15) },
        { month: 'OCTUBRE', x: 600, y: 880, events: [
            { title: 'Foro Energiza 2026 (MKT)', cat: '#BE123C', x: 700, y: 940 },
            { title: 'Foro Energiza 2026 (Ingeniería)', cat: '#F59E0B', x: 720, y: 940 },
            { title: 'Foro Energiza 2026 (Pachuca)', cat: '#16A34A', x: 740, y: 940 },
            { title: 'Foro Energiza 2026 (Admin)', cat: '#0891B2', x: 760, y: 940 },
            { title: 'Foro Energiza 2026 (Queretaro)', cat: '#92400E', x: 780, y: 940 },
            { title: 'Foro Energiza 2026 (Puebla)', cat: '#7E22CE', x: 800, y: 940 },
            { title: 'Mujeres Energizando', cat: '#BE123C', x: 860, y: 960 }
        ], date: new Date(2026, 9, 15) },
        { month: 'NOVIEMBRE', x: 1000, y: 880, events: [
            { title: 'Foro Innovación Energética', cat: '#7E22CE', x: 1050, y: 960 },
            { title: 'Encuentro Puebla-Veracruz', cat: '#7E22CE', x: 1100, y: 800 }
        ], date: new Date(2026, 10, 15) },
        { month: 'DICIEMBRE', x: 1250, y: 880, events: [
            { title: 'Implementación Sistema ERP', cat: '#0891B2', x: 1220, y: 800 }
        ], date: new Date(2026, 11, 15) }
    ];

    constructor() { }

    ngOnInit(): void {
        this.calculateProgress();
    }

    // Zoom & Pan Methods
    zoomIn(): void {
        this.zoom = Math.min(this.zoom + 0.2, 3);
    }

    zoomOut(): void {
        this.zoom = Math.max(this.zoom - 0.2, 0.5);
    }

    resetZoom(): void {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
    }

    onMouseDown(event: MouseEvent): void {
        this.isPanning = true;
        this.startX = event.clientX - this.panX;
        this.startY = event.clientY - this.panY;
    }

    onMouseMove(event: MouseEvent): void {
        if (!this.isPanning) return;
        this.panX = event.clientX - this.startX;
        this.panY = event.clientY - this.startY;
    }

    onMouseUp(): void {
        this.isPanning = false;
    }

    onWheel(event: WheelEvent): void {
        event.preventDefault();
        if (event.deltaY < 0) this.zoomIn();
        else this.zoomOut();
    }

    onTouchStart(event: TouchEvent): void {
        if (event.touches.length === 1) {
            this.isPanning = true;
            this.startX = event.touches[0].clientX - this.panX;
            this.startY = event.touches[0].clientY - this.panY;
        }
    }

    onTouchMove(event: TouchEvent): void {
        if (!this.isPanning || event.touches.length !== 1) return;
        this.panX = event.touches[0].clientX - this.startX;
        this.panY = event.touches[0].clientY - this.startY;
    }

    onTouchEnd(): void {
        this.isPanning = false;
    }

    calculateProgress(): void {
        const now = new Date();
        const startOfYear = new Date(2026, 0, 1);
        const endOfYear = new Date(2026, 11, 31);
        
        if (now < startOfYear) {
            this.currentProgress = 0;
        } else if (now > endOfYear) {
            this.currentProgress = 100;
        } else {
            const total = endOfYear.getTime() - startOfYear.getTime();
            const elapsed = now.getTime() - startOfYear.getTime();
            this.currentProgress = Math.round((elapsed / total) * 100);
        }
    }

    isMilestoneReached(date: Date): boolean {
        return new Date() >= date;
    }
}
