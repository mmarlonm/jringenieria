import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';
import { ProcesoComercialComponent } from 'app/shared/proceso-comercial/proceso-comercial.component';
import { Lead, LeadArchivo, LeadSeguimiento, LeadsService } from '../leads.service';
import { LeadDialogComponent } from '../lead-dialog/lead-dialog.component';

export interface LeadVerDialogData {
  lead: Lead;
  users?: any[];
}

/** Visualizacion de solo lectura de un lead (como el "ver" de Requerimientos). */
@Component({
  selector: 'app-lead-ver-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ProcesoComercialComponent
  ],
  templateUrl: './lead-ver-dialog.component.html'
})
export class LeadVerDialogComponent implements OnInit {
  lead: Lead;

  archivos: LeadArchivo[] = [];
  cargandoArchivos = false;
  errorArchivos: string | null = null;

  seguimientos: LeadSeguimiento[] = [];
  cargandoSeguimientos = false;
  errorSeguimientos: string | null = null;
  procesandoAccion = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: LeadVerDialogData,
    public dialogRef: MatDialogRef<LeadVerDialogComponent>,
    private leadsService: LeadsService,
    private dialog: MatDialog,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.lead = data.lead;
  }

  ngOnInit(): void {
    this.cargarArchivos();
    this.cargarSeguimientos();
  }

  get usuarioAsignadoNombre(): string {
    if (this.lead?.usuarioAsignadoNombre && this.lead.usuarioAsignadoNombre.trim().length > 0) {
      return this.lead.usuarioAsignadoNombre;
    }
    if (this.data?.users && this.lead?.idUsuarioAsignado) {
      const u = this.data.users.find((x: any) => x.usuarioId === this.lead.idUsuarioAsignado);
      if (u) return u.nombreUsuario || u.nombreCompleto || u.email || '-';
    }
    return '-';
  }

  get estaCalificado(): boolean {
    return this.lead.estatus === 'Oportunidad';
  }

  get estaDescartado(): boolean {
    return this.lead.estatus === 'Descartado';
  }

  cargarArchivos(): void {
    this.cargandoArchivos = true;
    this.errorArchivos = null;
    this.leadsService.getArchivosLead(this.lead.id).subscribe({
      next: (archivos) => {
        this.archivos = archivos ?? [];
        this.cargandoArchivos = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargandoArchivos = false;
        this.errorArchivos = err?.error?.mensaje ?? 'No se pudieron cargar los archivos.';
        this.cdr.markForCheck();
      }
    });
  }

  cargarSeguimientos(): void {
    this.cargandoSeguimientos = true;
    this.errorSeguimientos = null;
    this.leadsService.getSeguimientosLead(this.lead.id).subscribe({
      next: (seguimientos) => {
        this.seguimientos = seguimientos ?? [];
        this.cargandoSeguimientos = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.cargandoSeguimientos = false;
        this.errorSeguimientos = err?.error?.mensaje ?? 'No se pudieron cargar los seguimientos.';
        this.cdr.markForCheck();
      }
    });
  }

  descargarArchivo(archivo: LeadArchivo): void {
    const url = this.leadsService.descargarArchivoLead(this.lead.id, archivo.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = archivo.nombreArchivo;
    a.click();
  }

  convertirARequerimiento(): void {
    if (this.procesandoAccion) return;

    Swal.fire({
      title: '¿Convertir en Requerimiento?',
      text: 'Se creará el Requerimiento formal con los datos del lead calificado.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, convertir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb'
    }).then((res) => {
      if (res.isConfirmed) {
        this.procesandoAccion = true;
        this.cdr.markForCheck();
        this.leadsService.convertirARequerimiento(this.lead.id).subscribe({
          next: (resp) => {
            this.procesandoAccion = false;
            this.lead.requerimientoId = resp.requerimientoId;
            this.lead.requerimientoFolio = resp.folio;
            this.lead.estatus = 'Oportunidad';
            this.cdr.markForCheck();

            Swal.fire({
              icon: 'success',
              title: 'Requerimiento generado',
              text: `Folio: ${resp.folio}. Redirigiendo a Requerimientos...`,
              timer: 1800,
              showConfirmButton: false
            });

            this.dialogRef.close({ accion: 'convertido', folio: resp.folio });
            this.router.navigate(['/crm/requerimientos'], { queryParams: { folio: resp.folio } });
          },
          error: (err) => {
            this.procesandoAccion = false;
            this.cdr.markForCheck();
            Swal.fire('Error', err?.error?.mensaje || 'No se pudo convertir el lead a requerimiento.', 'error');
          }
        });
      }
    });
  }

  descartarLead(): void {
    const dialogRef = this.dialog.open(LeadDialogComponent, {
      width: '500px',
      data: { action: 'discard', lead: this.lead }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.action === 'discard') {
        this.procesandoAccion = true;
        this.cdr.markForCheck();
        this.leadsService.discardLead(this.lead.id, result.data).subscribe({
          next: (leadActualizado) => {
            this.procesandoAccion = false;
            this.lead = leadActualizado;
            this.cdr.markForCheck();
            Swal.fire({
              icon: 'success',
              title: 'Lead descartado',
              text: 'El prospecto fue marcado como Descartado.',
              timer: 1800,
              showConfirmButton: false
            });
            this.dialogRef.close({ accion: 'descartado', lead: leadActualizado });
          },
          error: (err) => {
            this.procesandoAccion = false;
            this.cdr.markForCheck();
            Swal.fire('Error', err?.error?.mensaje || 'Error al descartar el lead.', 'error');
          }
        });
      }
    });
  }

  calificarLead(): void {
    const dialogRef = this.dialog.open(LeadDialogComponent, {
      width: '650px',
      data: { action: 'convert', lead: this.lead }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.action === 'convert') {
        this.procesandoAccion = true;
        this.cdr.markForCheck();
        this.leadsService.convertLead(this.lead.id, result.data).subscribe({
          next: (leadActualizado) => {
            this.procesandoAccion = false;
            this.lead = leadActualizado;
            this.cdr.markForCheck();
            Swal.fire({
              icon: 'success',
              title: 'Lead calificado',
              text: 'El prospecto fue calificado y pasó a Oportunidad.',
              timer: 1800,
              showConfirmButton: false
            });
            this.dialogRef.close({ accion: 'calificado', lead: leadActualizado });
          },
          error: (err) => {
            this.procesandoAccion = false;
            this.cdr.markForCheck();
            const msg = err?.error?.message || err?.error?.mensaje || 'No se pudo calificar el lead.';
            Swal.fire('Error', msg, 'error');
          }
        });
      }
    });
  }

  irARequerimiento(folio?: string): void {
    const fol = folio || this.lead.requerimientoFolio;
    this.dialogRef.close({ accion: 'navegar', folio: fol });
    this.router.navigate(['/crm/requerimientos'], { queryParams: { folio: fol } });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
