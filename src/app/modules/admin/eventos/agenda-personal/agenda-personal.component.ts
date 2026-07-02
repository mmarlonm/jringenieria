import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActividadesService } from '../actividades/actividades.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-agenda-personal',
    templateUrl: './agenda-personal.component.html',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule
    ]
})
export class AgendaPersonalComponent implements OnInit {
    token: string = '';
    personal: any = null;
    actividades: any[] = [];
    isLoading: boolean = true;
    hasError: boolean = false;

    constructor(
        private _route: ActivatedRoute,
        private _actividadesService: ActividadesService
    ) { }

    ngOnInit(): void {
        this.token = this._route.snapshot.paramMap.get('token') || '';
        if (this.token) {
            this.loadAgenda();
        } else {
            this.isLoading = false;
            this.hasError = true;
        }
    }

    loadAgenda(): void {
        this.isLoading = true;
        this._actividadesService.getPublicActivitiesByToken(this.token).subscribe({
            next: (data) => {
                this.personal = data.personal;
                this.actividades = data.actividades || [];
                this.isLoading = false;
                this.hasError = false;
            },
            error: (err) => {
                console.error(err);
                this.isLoading = false;
                this.hasError = true;
            }
        });
    }

    async exportPdf(): Promise<void> {
        if (!this.personal) return;

        Swal.fire({
            title: 'Generando PDF...',
            text: 'Por favor, espera un momento.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const jsPdfModule = await import('jspdf');
            const jsPDF = (jsPdfModule as any).default ?? jsPdfModule;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // 1. Header background styling (Indigo gradient style)
            doc.setFillColor(79, 70, 229); // Indigo 600
            doc.rect(0, 0, 210, 45, 'F');

            // 2. Header text
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text('JR INGENIERÍA ELÉCTRICA', 15, 20);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.text('AGENDA PERSONAL DE ACTIVIDADES', 15, 28);
            doc.text('Control de Eventos y Logística', 15, 34);

            // 3. User info box
            doc.setFillColor(248, 250, 252); // Slate 50
            doc.rect(15, 55, 180, 30, 'F');
            doc.setDrawColor(226, 232, 240); // Slate 200
            doc.rect(15, 55, 180, 30, 'D');

            doc.setTextColor(15, 23, 42); // Slate 900
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(this.personal.nombreCompleto.toUpperCase(), 20, 63);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105); // Slate 600
            doc.text(`Puesto / Cargo: ${this.personal.cargo || 'N/A'}`, 20, 71);
            doc.text(`Empresa: ${this.personal.empresa || 'JR'}`, 20, 77);
            doc.text(`Tipo: ${this.personal.tipoPersonal}`, 120, 71);

            // 4. Activities section title
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('Cronograma de Actividades Asignadas', 15, 98);

            // Draw line
            doc.setDrawColor(79, 70, 229);
            doc.setLineWidth(0.5);
            doc.line(15, 101, 195, 101);

            // 5. Loop activities
            let y = 110;
            doc.setFontSize(10);

            if (this.actividades.length === 0) {
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(148, 163, 184); // Slate 400
                doc.text('No tienes actividades asignadas para este evento actualmente.', 20, y);
            } else {
                this.actividades.forEach((act, index) => {
                    // Check if we need a new page
                    if (y > 260) {
                        doc.addPage();
                        y = 20;
                        doc.setDrawColor(79, 70, 229);
                        doc.setLineWidth(0.5);
                        doc.line(15, y, 195, y);
                        y += 10;
                    }

                    // Activity Box
                    doc.setFillColor(255, 255, 255);
                    doc.setDrawColor(241, 245, 249);
                    doc.rect(15, y, 180, 24, 'F');
                    
                    // Left color accent bar
                    doc.setFillColor(79, 70, 229);
                    doc.rect(15, y, 2, 24, 'F');

                    // Title
                    doc.setTextColor(15, 23, 42);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10.5);
                    doc.text(`${index + 1}. ${act.titulo}`, 20, y + 6);

                    // Event info
                    doc.setTextColor(79, 70, 229);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8.5);
                    doc.text(act.eventoNombre, 120, y + 6);

                    // Date range
                    const startStr = this.formatDate(act.fechaInicio);
                    const endStr = this.formatDate(act.fechaFin);
                    doc.setTextColor(100, 116, 139); // Slate 500
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.text(`Horario: ${startStr} - ${endStr}`, 20, y + 12);

                    // Description
                    const desc = act.descripcion || 'Sin detalles adicionales.';
                    doc.setTextColor(71, 85, 105);
                    doc.setFontSize(8.5);
                    const splitDesc = doc.splitTextToSize(desc, 170);
                    doc.text(splitDesc, 20, y + 18);

                    y += 30; // spacer
                });
            }

            // Footer
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
                doc.text('Este documento es una agenda de actividades oficial generada por JR Ingeniería Eléctrica.', 105, 292, { align: 'center' });
            }

            doc.save(`Agenda_${this.personal.nombreCompleto.replace(/\s+/g, '_')}.pdf`);
            Swal.close();
        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'No se pudo generar el archivo PDF.', 'error');
        }
    }

    formatDate(dateStr: string): string {
        const d = new Date(dateStr);
        const options: Intl.DateTimeFormatOptions = { 
            day: 'numeric', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        };
        return d.toLocaleDateString('es-MX', options);
    }
}
