import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-registro-staff',
    templateUrl: './registro-staff.component.html',
    standalone: true,
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistroStaffComponent implements OnInit {
    eventoId: number = 0;
    
    // Form fields
    nombreCompleto: string = '';
    telefonoWhatsapp: string = '';
    esAlergico: string = 'no'; // 'si' o 'no'
    alergiaCual: string = '';
    fotoArchivo: File | null = null;
    fotoPreview: string | null = null;

    isSubmitting: boolean = false;
    isSuccess: boolean = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            if (params['eventoId']) {
                this.eventoId = Number(params['eventoId']);
            } else {
                Swal.fire('Error', 'No se ha especificado el evento.', 'error');
            }
        });
    }

    onFileSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.fotoArchivo = file;

            // Image preview
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.fotoPreview = e.target.result;
                this.cdr.markForCheck();
            };
            reader.readAsDataURL(file);
        }
    }

    removeFoto(): void {
        this.fotoArchivo = null;
        this.fotoPreview = null;
        this.cdr.markForCheck();
    }

    async submitForm(): Promise<void> {
        if (!this.nombreCompleto.trim()) {
            Swal.fire('Atención', 'El nombre completo es obligatorio.', 'warning');
            return;
        }

        if (!this.fotoArchivo) {
            Swal.fire('Atención', 'Es obligatorio subir una fotografía.', 'warning');
            return;
        }

        if (this.esAlergico === 'si' && !this.alergiaCual.trim()) {
            Swal.fire('Atención', 'Por favor especifica a qué alimento eres alérgico.', 'warning');
            return;
        }

        this.isSubmitting = true;
        this.cdr.markForCheck();

        const formData = new FormData();
        formData.append('NombreCompleto', this.nombreCompleto);
        formData.append('TelefonoWhatsapp', this.telefonoWhatsapp);
        formData.append('EsAlergicoAlimento', this.esAlergico === 'si' ? 'true' : 'false');
        if (this.esAlergico === 'si') {
            formData.append('AlergiaCual', this.alergiaCual);
        }
        formData.append('Foto', this.fotoArchivo);

        try {
            await this.http.post(`${environment.apiUrl}/PersonalStaff/public-register/${this.eventoId}`, formData).toPromise();
            this.isSuccess = true;
            this.isSubmitting = false;
            this.cdr.markForCheck();
            Swal.fire('¡Éxito!', 'Tu registro se ha completado correctamente.', 'success');
        } catch (error: any) {
            this.isSubmitting = false;
            this.cdr.markForCheck();
            console.error('Error registering staff:', error);
            Swal.fire('Error', 'Ocurrió un problema al enviar tu información. Intenta de nuevo.', 'error');
        }
    }
}
