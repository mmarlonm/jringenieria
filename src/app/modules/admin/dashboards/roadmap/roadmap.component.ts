import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import {
    MISION_DATA,
    VISION_DATA,
    VALORES_LIST,
    RADIAL_DEPARTAMENTOS,
    RADIAL_NODES,
    RADIAL_CONNECTORS,
    MisionVisionItem,
    ValorItem,
    RadialDepartmentFilter,
    RadialNode,
    RadialConnector
} from './identidad.data';

export interface SectorGeometry {
    valor: ValorItem;
    path: string;
    textX: number;
    textY: number;
    badgeX: number;
    badgeY: number;
    rotAngle: number;
}

@Component({
    selector: 'app-roadmap',
    standalone: true,
    imports: [CommonModule, MatButtonToggleModule, MatIconModule, MatTooltipModule, FormsModule],
    templateUrl: './roadmap.component.html',
    encapsulation: ViewEncapsulation.None,
    styles: [`
        .glass-panel {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(226, 232, 240, 0.8);
        }
        .dark .glass-panel {
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(51, 65, 85, 0.5);
        }
        .nav-tab-active {
            background: linear-gradient(135deg, #0284c7 0%, #16a34a 100%);
            color: white !important;
            box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.35);
        }
        .wheel-slice {
            cursor: pointer;
            transition: all 0.25s ease-out;
            transform-origin: 320px 320px;
        }
        .wheel-slice:hover {
            filter: brightness(1.1) drop-shadow(0 0 10px rgba(0, 0, 0, 0.25));
            transform: scale(1.025);
        }
        .radial-node-circle {
            transition: transform 0.25s ease, filter 0.25s ease, opacity 0.3s ease;
            transform-origin: center;
            transform-box: fill-box;
            cursor: pointer;
        }
        .radial-node-circle:hover {
            transform: scale(1.15);
            filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.25));
        }
        .outer-orbit-text {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            letter-spacing: 3px;
        }
        @keyframes selection-dash-crawl {
            from {
                stroke-dashoffset: 0;
            }
            to {
                stroke-dashoffset: -32;
            }
        }
        .selection-dash-crawl {
            animation: selection-dash-crawl 1.8s linear infinite;
        }
    `]
})
export class RoadmapComponent implements OnInit {

    // Main Active Navigation Tab
    activeTab: 'mision-vision' | 'valores' | 'organigrama' | 'roadmap' = 'organigrama';

    // Data references
    mision: MisionVisionItem = MISION_DATA;
    vision: MisionVisionItem = VISION_DATA;
    valores: ValorItem[] = VALORES_LIST;
    departamentos: RadialDepartmentFilter[] = RADIAL_DEPARTAMENTOS;
    radialNodes: RadialNode[] = RADIAL_NODES;
    radialConnectors: RadialConnector[] = RADIAL_CONNECTORS;

    // Sub-view modes
    misionVisionMode: 'cards' | 'original' = 'cards';
    valoresViewMode: 'wheel' | 'grid' | 'original' = 'wheel';
    organigramaViewMode: 'orbital' | 'directory' | 'original' = 'orbital';

    // Valores state
    selectedValor: ValorItem = VALORES_LIST[0];
    wheelSectors: SectorGeometry[] = [];

    // Organigrama Interactive Pan & Zoom
    selectedDepartamentoId: string = 'todos';
    selectedRadialNode: RadialNode | null = null;
    activeDeptInfo: RadialDepartmentFilter = RADIAL_DEPARTAMENTOS[0];
    organigramaZoom: number = 0.95;
    organigramaPanX: number = 0;
    organigramaPanY: number = 0;
    private isOrganigramaPanning: boolean = false;
    private organigramaStartX: number = 0;
    private organigramaStartY: number = 0;
    private wasDraggedOrganigrama: boolean = false;
    private organigramaDragDistance: number = 0;
    isOrganigramaTransitioning: boolean = false;

    // Search query in directory
    organigramaSearch: string = '';

    // ==========================================
    // Existing Roadmap 2026 State
    // ==========================================
    viewMode: 'image' | 'interactive' = 'interactive';
    currentProgress: number = 0;
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

    ngOnInit(): void {
        this.calculateProgress();
        this.computeWheelGeometry();
    }

    // ==========================================
    // Rueda de Valores - Cálculo Geométrico SVG
    // ==========================================
    private computeWheelGeometry(): void {
        const cx = 320;
        const cy = 320;
        const rInner = 108;
        const rOuter = 245;
        const rBadge = 282;

        this.wheelSectors = this.valores.map((v, i) => {
            const angleStart = -90 - 20 + i * 40;
            const angleEnd = angleStart + 40;
            const midAngle = (angleStart + angleEnd) / 2;

            const radStart = ((angleStart + 1.2) * Math.PI) / 180;
            const radEnd = ((angleEnd - 1.2) * Math.PI) / 180;
            const radMid = (midAngle * Math.PI) / 180;

            const p1x = cx + rOuter * Math.cos(radStart);
            const p1y = cy + rOuter * Math.sin(radStart);
            const p2x = cx + rOuter * Math.cos(radEnd);
            const p2y = cy + rOuter * Math.sin(radEnd);
            const p3x = cx + rInner * Math.cos(radEnd);
            const p3y = cy + rInner * Math.sin(radEnd);
            const p4x = cx + rInner * Math.cos(radStart);
            const p4y = cy + rInner * Math.sin(radStart);

            const path = `M ${p1x.toFixed(1)} ${p1y.toFixed(1)} A ${rOuter} ${rOuter} 0 0 1 ${p2x.toFixed(1)} ${p2y.toFixed(1)} L ${p3x.toFixed(1)} ${p3y.toFixed(1)} A ${rInner} ${rInner} 0 0 0 ${p4x.toFixed(1)} ${p4y.toFixed(1)} Z`;

            const rText = (rInner + rOuter) / 2;
            const textX = cx + rText * Math.cos(radMid);
            const textY = cy + rText * Math.sin(radMid);

            const badgeX = cx + rBadge * Math.cos(radMid);
            const badgeY = cy + rBadge * Math.sin(radMid);

            return {
                valor: v,
                path,
                textX,
                textY,
                badgeX,
                badgeY,
                rotAngle: midAngle + 90
            };
        });
    }

    selectValor(valor: ValorItem): void {
        this.selectedValor = valor;
    }

    // ==========================================
    // Orbital Organigrama Zoom & Filtering
    // ==========================================
    filterByDepartamento(deptId: string): void {
        this.selectedDepartamentoId = deptId;
        const dept = this.departamentos.find(d => d.id === deptId);
        if (!dept) return;

        this.activeDeptInfo = dept;
        this.isOrganigramaTransitioning = true;

        if (deptId === 'todos') {
            this.organigramaZoom = 0.95;
            this.organigramaPanX = 0;
            this.organigramaPanY = 0;
            this.selectedRadialNode = null;
        } else {
            this.organigramaZoom = dept.focusZoom;
            this.organigramaPanX = dept.focusX;
            this.organigramaPanY = dept.focusY;

            // Highlight the department hub
            const hub = this.radialNodes.find(n => n.category === deptId && n.isDepartmentHub);
            if (hub) {
                this.selectedRadialNode = hub;
            }
        }

        setTimeout(() => {
            this.isOrganigramaTransitioning = false;
        }, 650);
    }

    selectRadialNode(node: RadialNode, event?: MouseEvent | TouchEvent): void {
        if (event) {
            event.stopPropagation();
        }

        if (this.wasDraggedOrganigrama) {
            return;
        }

        this.selectedRadialNode = node;
        this.isOrganigramaTransitioning = true;

        if (node.isCore) {
            this.selectedDepartamentoId = 'todos';
            const todosDept = this.departamentos.find(d => d.id === 'todos');
            if (todosDept) {
                this.activeDeptInfo = todosDept;
            }
            this.organigramaZoom = 1.35;
            this.organigramaPanX = (550 - node.cx) * 1.35;
            this.organigramaPanY = (500 - node.cy) * 1.35;
            setTimeout(() => {
                this.isOrganigramaTransitioning = false;
            }, 650);
            return;
        }

        // AUTO-ZOOM DIRECTLY INTO THE TOUCHED BUBBLE:
        // Center of the 1100x1000 coordinate frame is (550, 500)
        const targetZoom = node.isDepartmentHub ? 2.05 : 2.5;
        this.organigramaZoom = targetZoom;
        this.organigramaPanX = (550 - node.cx) * targetZoom;
        this.organigramaPanY = (500 - node.cy) * targetZoom;

        // Synchronize active department filter
        const dept = this.departamentos.find(d => d.id === node.category);
        if (dept) {
            this.selectedDepartamentoId = dept.id;
            this.activeDeptInfo = dept;
        }

        setTimeout(() => {
            this.isOrganigramaTransitioning = false;
        }, 650);
    }

    getCategoryTitle(category: string): string {
        switch (category) {
            case 'administracion': return 'Administración';
            case 'ingenieria': return 'Ingeniería';
            case 'comercial': return 'Desarrollo Comercial';
            case 'puebla': return 'Sucursal Puebla';
            case 'pachuca': return 'Sucursal Pachuca';
            case 'queretaro': return 'Sucursal Querétaro';
            case 'cliente': return 'Cliente';
            case 'direccion': return 'Dirección General';
            default: return category;
        }
    }

    getParentNode(node: RadialNode | null | undefined): RadialNode | undefined {
        if (!node || !node.parentId) return undefined;
        return this.radialNodes.find(n => n.id === node.parentId);
    }

    deselectRadialNode(): void {
        this.selectedRadialNode = null;
    }

    onNodeTouchEnd(node: RadialNode, event: TouchEvent): void {
        if (!this.wasDraggedOrganigrama) {
            event.stopPropagation();
            this.selectRadialNode(node);
        }
    }

    selectNodeFromDirectory(node: RadialNode): void {
        this.organigramaViewMode = 'orbital';
        setTimeout(() => {
            this.selectRadialNode(node);
        }, 150);
    }

    zoomInOrganigrama(): void {
        this.isOrganigramaTransitioning = true;
        this.organigramaZoom = Math.min(this.organigramaZoom + 0.3, 3.5);
        setTimeout(() => this.isOrganigramaTransitioning = false, 300);
    }

    zoomOutOrganigrama(): void {
        this.isOrganigramaTransitioning = true;
        this.organigramaZoom = Math.max(this.organigramaZoom - 0.3, 0.55);
        setTimeout(() => this.isOrganigramaTransitioning = false, 300);
    }

    resetOrganigramaZoom(): void {
        this.filterByDepartamento('todos');
    }

    onOrganigramaMouseDown(event: MouseEvent): void {
        this.isOrganigramaPanning = true;
        this.wasDraggedOrganigrama = false;
        this.organigramaDragDistance = 0;
        this.organigramaStartX = event.clientX - this.organigramaPanX;
        this.organigramaStartY = event.clientY - this.organigramaPanY;
    }

    onOrganigramaMouseMove(event: MouseEvent): void {
        if (!this.isOrganigramaPanning) return;
        const newX = event.clientX - this.organigramaStartX;
        const newY = event.clientY - this.organigramaStartY;
        this.organigramaDragDistance += Math.hypot(newX - this.organigramaPanX, newY - this.organigramaPanY);
        if (this.organigramaDragDistance > 7) {
            this.wasDraggedOrganigrama = true;
        }
        this.organigramaPanX = newX;
        this.organigramaPanY = newY;
    }

    onOrganigramaMouseUp(): void {
        this.isOrganigramaPanning = false;
        setTimeout(() => {
            this.wasDraggedOrganigrama = false;
        }, 120);
    }

    onOrganigramaWheel(event: WheelEvent): void {
        event.preventDefault();
        const delta = event.deltaY < 0 ? 0.15 : -0.15;
        this.organigramaZoom = Math.min(Math.max(this.organigramaZoom + delta, 0.5), 3.8);
    }

    onOrganigramaTouchStart(event: TouchEvent): void {
        if (event.touches.length === 1) {
            this.isOrganigramaPanning = true;
            this.wasDraggedOrganigrama = false;
            this.organigramaDragDistance = 0;
            this.organigramaStartX = event.touches[0].clientX - this.organigramaPanX;
            this.organigramaStartY = event.touches[0].clientY - this.organigramaPanY;
        }
    }

    onOrganigramaTouchMove(event: TouchEvent): void {
        if (!this.isOrganigramaPanning || event.touches.length !== 1) return;
        const newX = event.touches[0].clientX - this.organigramaStartX;
        const newY = event.touches[0].clientY - this.organigramaStartY;
        this.organigramaDragDistance += Math.hypot(newX - this.organigramaPanX, newY - this.organigramaPanY);
        if (this.organigramaDragDistance > 7) {
            this.wasDraggedOrganigrama = true;
        }
        this.organigramaPanX = newX;
        this.organigramaPanY = newY;
    }

    onOrganigramaTouchEnd(): void {
        this.isOrganigramaPanning = false;
        setTimeout(() => {
            this.wasDraggedOrganigrama = false;
        }, 120);
    }

    isNodeHighlighted(node: RadialNode): boolean {
        if (this.selectedDepartamentoId === 'todos') return true;
        if (node.category === 'cliente') return true;
        return node.category === this.selectedDepartamentoId;
    }

    isConnectorHighlighted(conn: RadialConnector): boolean {
        if (this.selectedDepartamentoId === 'todos') return true;
        const toNode = this.radialNodes.find(n => n.id === conn.toId);
        if (!toNode) return true;
        return toNode.category === this.selectedDepartamentoId;
    }

    get filteredDirectoryNodes(): RadialNode[] {
        const nonCore = this.radialNodes.filter(n => !n.isCore);
        if (!this.organigramaSearch.trim()) {
            return nonCore;
        }
        const q = this.organigramaSearch.toLowerCase();
        return nonCore.filter(n =>
            n.person.toLowerCase().includes(q) ||
            n.role.toLowerCase().includes(q) ||
            n.category.toLowerCase().includes(q)
        );
    }

    // ==========================================
    // Existing Roadmap Pan & Zoom Handlers
    // ==========================================
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
